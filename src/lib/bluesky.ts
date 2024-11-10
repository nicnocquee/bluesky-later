import { BskyAgent, RichText } from "@atproto/api";
import { createDatabase, db } from "./db";

interface ImageInfo {
  url?: string;
  type: string;
  size: number;
  height: number;
  width: number;
  size_pretty: string;
}

interface WebsiteData {
  lang: string;
  author: string;
  title: string;
  publisher: string;
  image?: ImageInfo;
  url: string;
  description: string;
  date: string;
  logo: ImageInfo;
}

interface WebsiteResponse {
  status: "success";
  data?: WebsiteData;
  statusCode: number;
}

export const agent = new BskyAgent({
  service: "https://bsky.social",
});

export async function getStoredCredentials() {
  const creds = await db.getCredentials();
  return creds;
}

export async function login(identifier: string, password: string) {
  await agent.login({ identifier, password });
  await db.setCredentials({ identifier, password });
}

async function fetchUrlMetadata(url: string) {
  try {
    const microlinkResponse = await fetch(
      `https://api.microlink.io?meta=true&url=${encodeURIComponent(url)}`,
      {
        headers: import.meta.env.MICROLINK_API_KEY
          ? {
              "x-api-key": import.meta.env.MICROLINK_API_KEY,
            }
          : undefined,
      }
    );
    const microlinkResponseJson =
      (await microlinkResponse.json()) as WebsiteResponse;

    if (microlinkResponseJson.status !== "success") {
      throw new Error("Failed to fetch metadata");
    }

    if (!microlinkResponseJson.data) {
      throw new Error("Failed to fetch metadata");
    }

    const {
      data: { title, description, image },
    } = microlinkResponseJson;

    let websiteImage: BlobRefType | undefined = undefined;
    try {
      if (image && image.url) {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
          image.url
        )}`;
        const imageResponse = await fetch(proxyUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }
        const imageBlob = await imageResponse.blob();
        const extension = image.type?.split("/")[1] || "jpg";
        const file = new File([imageBlob], `preview.${extension}`, {
          type: image.type,
        });
        const uploadResult = await uploadImage(file);
        websiteImage = uploadResult.blobRef;
      }
    } catch (error) {
      console.error("Failed to fetch image:", error);
    }

    return {
      uri: url,
      title: title || url,
      description: description || "",
      thumb: websiteImage,
    };
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return {
      uri: url,
      title: url,
      description: "",
      thumb: undefined,
    };
  }
}

export async function uploadImage(file: File) {
  const creds = await getStoredCredentials();
  if (!creds) throw new Error("Not authenticated");

  await agent.login({ identifier: creds.identifier, password: creds.password });

  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);
  const response = await agent.uploadBlob(uint8Array, {
    encoding: file.type,
  });

  // Structure the blob reference with $link
  return {
    blobRef: {
      $type: "blob",
      ref: {
        $link: response.data.blob.ref.toString(), // Convert the ref to the correct $link format
      },
      mimeType: response.data.blob.mimeType,
      size: response.data.blob.size,
    },
    type: file.type,
    url: URL.createObjectURL(file), // Add this for local preview
  };
}

export type UploadImageResult = Awaited<ReturnType<typeof uploadImage>>;
export type BlobRefType = UploadImageResult["blobRef"];

export async function checkScheduledPosts(workerCredentials?: string) {
  const workerDb = workerCredentials ? createDatabase(workerCredentials) : db;
  const pendingPosts = await workerDb.getPendingPosts();

  const creds = await workerDb.getCredentials();
  if (!creds) return;

  try {
    await agent.login({
      identifier: creds.identifier,
      password: creds.password,
    });

    for (const post of pendingPosts) {
      try {
        // Create a RichText instance
        const richText = new RichText({ text: post.content });
        // Process the text to detect mentions, links, etc.
        await richText.detectFacets(agent);

        const postData: {
          text: string;
          facets?: RichText["facets"];
          createdAt: string;
          embed?: {
            $type: string;
            images?: Array<{
              alt: string;
              image: {
                $type: string;
                ref: {
                  $link: string;
                };
                mimeType: string;
                size: number;
              };
            }>;
            external?: {
              uri: string;
              title: string;
              description: string;
              thumb?: BlobRefType;
            };
          };
        } = {
          text: richText.text,
          facets: richText.facets,
          createdAt: new Date().toISOString(),
        };

        if (post.url) {
          const urlEmbed = await fetchUrlMetadata(post.url);
          postData.embed = {
            $type: "app.bsky.embed.external",
            external: urlEmbed,
          };
        } else if (post.image?.blobRef) {
          postData.embed = {
            $type: "app.bsky.embed.images",
            images: [
              {
                alt: post.image.alt || "",
                image: post.image.blobRef,
              },
            ],
          };
        }

        await agent.post(postData);
        await db.updatePost(post.id!, { status: "published" });
      } catch (error: unknown) {
        console.error("Post creation error:", error);
        await db.updatePost(post.id!, { status: "published" });
      }
    }
  } catch (error: unknown) {
    console.error("Failed to process scheduled posts:", error);
  }
}
