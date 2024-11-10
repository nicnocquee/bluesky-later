import { useState, useEffect } from "react";
import { getStoredCredentials } from "../lib/bluesky";

interface AuthState {
  identifier: string | undefined;
  isLoading: boolean;
  hasApiCredentials: boolean;
  isApiAuthenticated: boolean;
}

async function checkBlueskyAuth() {
  const creds = await getStoredCredentials();
  return creds?.identifier;
}

async function checkApiCredentials() {
  try {
    const response = await fetch("/api/auth/check", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.status === 200;
  } catch (error) {
    console.error("Failed to check API credentials:", error);
    return false;
  }
}

async function checkLocalApiAuth() {
  return !!localStorage.getItem("apiCredentials");
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    identifier: undefined,
    isLoading: true,
    hasApiCredentials: true,
    isApiAuthenticated: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      if (import.meta.env.VITE_STORAGE_MODE === "remote") {
        const [identifier, hasServerCreds, isLocallyAuthenticated] =
          await Promise.all([
            checkBlueskyAuth(),
            checkApiCredentials(),
            checkLocalApiAuth(),
          ]);

        setAuthState({
          identifier,
          isLoading: false,
          hasApiCredentials: hasServerCreds,
          isApiAuthenticated: isLocallyAuthenticated,
        });
      } else {
        const identifier = await checkBlueskyAuth();
        setAuthState({
          identifier,
          isLoading: false,
          hasApiCredentials: true,
          isApiAuthenticated: true,
        });
      }
    };

    checkAuth();
  }, []);

  const updateIdentifier = (newIdentifier: string | undefined) => {
    setAuthState((prev) => ({ ...prev, identifier: newIdentifier }));
  };

  const updateApiAuth = (isAuthenticated: boolean) => {
    setAuthState((prev) => ({ ...prev, isApiAuthenticated: isAuthenticated }));
  };

  return {
    ...authState,
    updateIdentifier,
    updateApiAuth,
  };
}
