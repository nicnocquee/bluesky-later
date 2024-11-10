// src/workers/scheduler.ts
let intervalId: NodeJS.Timeout | null = null;
let credentials: string | null = null;

self.onmessage = (e) => {
  if (e.data.type === "start") {
    credentials = e.data.credentials;
    intervalId = setInterval(async () => {
      const { checkScheduledPosts } = await import("../lib/bluesky");
      await checkScheduledPosts(credentials || undefined);
    }, 60000);
  } else if (e.data.type === "stop") {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};
