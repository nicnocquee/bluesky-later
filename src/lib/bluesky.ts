import { BskyAgent, RichText } from "@atproto/api";
import { createDatabase, db } from "./db";
import { BlobRefType, PostData } from "./db/types";

interface WebsiteData {
  lang: string;
  author: string;
  title: string;
  publisher: string;
  image?: string;
  url: string;
  description: string;
  date: string;
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
    const metadataFetcherResponse = await fetch(
      `${import.meta.env.VITE_METADATA_FETCHER_URL}${url}`
    );
    const metadataFetcherResponseJson =
      (await metadataFetcherResponse.json()) as WebsiteData;

    if (!metadataFetcherResponseJson) {
      throw new Error("Failed to fetch metadata");
    }

    const { title, description, image } = metadataFetcherResponseJson;

    console.log(image);
    let websiteImage: BlobRefType | undefined = undefined;
    let websiteImageLocalUrl: string | undefined = undefined;
    try {
      if (image) {
        const proxyUrl = `${import.meta.env.VITE_IMAGE_PROXY_URL}${image}`;
        const imageResponse = await fetch(proxyUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }
        const imageBlob = await imageResponse.blob();
        const file = new File([imageBlob], `preview.${imageBlob.type}`, {
          type: imageBlob.type,
        });
        const uploadResult = await uploadImage(file);
        websiteImage = uploadResult.blobRef;
        websiteImageLocalUrl = URL.createObjectURL(file);
      }
    } catch (error) {
      console.error("Failed to fetch image:", error);
    }

    console.log(websiteImage);

    return {
      uri: url,
      title: title || url,
      description: description || "",
      thumb: websiteImage,
      websiteImageLocalUrl,
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
        await agent.post(post.data);
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

export const getPostData = async ({
  content,
  url,
  image,
}: {
  content: string;
  url?: string;
  image?: {
    blobRef?: BlobRefType;
    alt?: string;
    url?: string;
  };
}): Promise<PostData> => {
  // Create a RichText instance
  const richText = new RichText({ text: content });
  // Process the text to detect mentions, links, etc.
  await richText.detectFacets(agent);

  const postData: PostData = {
    text: richText.text,
    facets: richText.facets,
    createdAt: new Date().toISOString(),
  };

  if (url) {
    const { websiteImageLocalUrl, ...urlEmbed } = await fetchUrlMetadata(url);
    console.log(websiteImageLocalUrl);
    postData.embed = {
      $type: "app.bsky.embed.external",
      external: urlEmbed,
    };
  } else if (image?.blobRef) {
    postData.embed = {
      $type: "app.bsky.embed.images",
      images: [
        {
          alt: image.alt || "",
          image: image.blobRef,
          localUrl: image.url,
        },
      ],
    };
  }

  return postData;
};
