import React, { useState } from "react";
import { Calendar, Clock, Send } from "lucide-react";
import { db } from "../lib/db";
import toast from "react-hot-toast";
import { format, addHours } from "date-fns";
import { ImageUpload } from "./image-upload";
import { OfflineInfo } from "./offline-info";
import { useLocalStorage } from "./hooks/use-local-storage";

export function PostScheduler() {
  const [, setLastUpdated] = useLocalStorage("lastUpdated");
  const defaultDate = addHours(new Date(), 24);
  const [content, setContent] = useState("");
  const [scheduledDate, setScheduledDate] = useState(
    format(defaultDate, "yyyy-MM-dd")
  );
  const [scheduledTime, setScheduledTime] = useState(
    format(defaultDate, "HH:mm")
  );
  const [image, setImage] = useState<
    { url: string; type: string; alt: string } | undefined
  >();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content || !scheduledDate || !scheduledTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
    const urls = extractUrls(content);
    const firstUrl = urls[0]; // We'll use the first URL found

    if (scheduledFor < new Date()) {
      toast.error("Cannot schedule posts in the past");
      return;
    }

    try {
      await db.createPost({
        content,
        scheduledFor,
        status: "pending",
        image,
        url: firstUrl,
      });

      toast.success("Post scheduled successfully!");
      setContent("");

      const defaultDate = addHours(new Date(), 24);
      setScheduledDate(format(defaultDate, "yyyy-MM-dd"));
      setScheduledTime(format(defaultDate, "HH:mm"));
      setImage(undefined);
      setLastUpdated(new Date().toISOString());
    } catch (error: unknown) {
      console.log(error);
      toast.error("Failed to schedule post");
    }
  };

  return (
    <div className="mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Schedule New Post</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Post Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[150px]"
            placeholder="What's on your mind?"
            maxLength={300}
          />
          <p className="text-sm text-gray-500 mt-1">
            {300 - content.length} characters remaining
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image (optional)
          </label>
          <ImageUpload
            onImageSelect={setImage}
            onImageClear={() => setImage(undefined)}
            selectedImage={image}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Send className="h-5 w-5" />
          Schedule Post
        </button>
        <OfflineInfo />
      </form>
    </div>
  );
}

// In post-scheduler.tsx, add this function before the PostScheduler component
function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}
