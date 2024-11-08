import { useEffect, useState } from "react";
import { LoginForm } from "./components/login-form";
import { PostScheduler } from "./components/post-scheduler";
import { ScheduledPosts } from "./components/scheduled-posts";
import { getStoredCredentials } from "./lib/bluesky";
import { Toaster } from "react-hot-toast";
import { db } from "./lib/db";
import { Footer } from "./components/footer";

function App() {
  const [identifier, setIdentifier] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const creds = await getStoredCredentials();
      setIdentifier(creds?.identifier);
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    let worker: Worker | null = null;

    if (identifier) {
      worker = new Worker(new URL("./workers/scheduler.ts", import.meta.url));
      worker.postMessage("start");
    }

    return () => {
      if (worker) {
        worker.postMessage("stop");
        worker.terminate();
      }
    };
  }, [identifier]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!identifier) {
    return (
      <div className="relative">
        <LoginForm onSuccess={setIdentifier} />
        <Toaster position="top-right" />
      </div>
    );
  }

  const handleLogout = async () => {
    await db.deleteCredentials(); // Clear credentials from the database
    setIdentifier(undefined); // Update authenticated state
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Bluesky Post Scheduler
          </h1>
          <button className="hover:underline text-sm" onClick={handleLogout}>
            Logout (@{identifier})
          </button>
        </div>
      </header>

      <main className="px-6 lg:px-8 mb-8">
        <div className="max-w-7xl  mx-auto px-4 py-6 sm:px-0 sm:grid sm:grid-cols-2 gap-2">
          <div className="w-full">
            <PostScheduler />
          </div>
          <div className="w-full">
            <ScheduledPosts />
          </div>
        </div>
      </main>
      <Toaster position="top-right" />
      <Footer />
    </div>
  );
}

export default App;
