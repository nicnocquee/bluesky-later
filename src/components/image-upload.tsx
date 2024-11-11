import React, { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { uploadImage } from "../lib/bluesky";
import toast from "react-hot-toast";
import { BlobRefType } from "@/lib/db/types";

interface ImageUploadProps {
  onImageSelect: (imageData: {
    url: string;
    type: string;
    alt: string;
    blobRef: BlobRefType;
  }) => void;
  onImageClear: () => void;
  selectedImage?: {
    url: string;
    alt: string;
    type?: string;
    blobRef?: BlobRefType;
  };
}

export function ImageUpload({
  onImageSelect,
  onImageClear,
  selectedImage,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [altText, setAltText] = useState(selectedImage?.alt || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const maxSize = 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      toast.error("Image must be less than 1MB");
      return;
    }

    setIsUploading(true);
    try {
      const { url, type, blobRef } = await uploadImage(file);
      onImageSelect({
        url,
        type,
        alt: altText,
        blobRef,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAltTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAltText(e.target.value);
    if (selectedImage && selectedImage.blobRef) {
      onImageSelect({
        ...selectedImage,
        alt: e.target.value,
        type: selectedImage.type || "",
        blobRef: selectedImage.blobRef,
      });
    }
  };

  return (
    <div className="space-y-4">
      {!selectedImage ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-blue-500 transition-colors"
        >
          <div className="flex flex-col items-center">
            <ImagePlus className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">
              {isUploading ? "Uploading..." : "Click to upload an image"}
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative">
          <img
            src={selectedImage.url}
            alt={selectedImage.alt}
            className="w-full h-48 object-cover rounded-lg"
          />
          <button
            onClick={onImageClear}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <input
            type="text"
            value={altText}
            onChange={handleAltTextChange}
            placeholder="Add alt text for accessibility"
            className="mt-2 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}
    </div>
  );
}
