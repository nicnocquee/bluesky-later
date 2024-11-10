import React, { useState } from "react";
import { User, Lock } from "lucide-react";
import toast from "react-hot-toast";

export function ApiLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Try to make a test request to validate credentials
      const headers = new Headers();
      headers.set("Authorization", "Basic " + btoa(`${username}:${password}`));

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/credentials`,
        {
          headers,
        }
      );

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      // Save credentials and continue
      localStorage.setItem(
        "apiCredentials",
        JSON.stringify({ username, password })
      );

      toast.success("API login successful!");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col space-y-8 items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="space-y-2 text-center text-muted-foreground">
        <h1 className="text-4xl font-bold text-black">Bluesky Later</h1>
        <p>API Login</p>
      </div>
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
          Login to API
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
