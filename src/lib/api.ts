export async function makeAuthenticatedRequest(
  endpoint: string,
  options: RequestInit = {},
  providedCredentials?: string
) {
  const credentials =
    providedCredentials || localStorage.getItem("apiCredentials");
  if (!credentials) throw new Error("No API credentials found");

  const { username, password } = JSON.parse(credentials);
  const headers = new Headers(options.headers);
  headers.set("Authorization", "Basic " + btoa(`${username}:${password}`));

  return fetch(endpoint, {
    ...options,
    headers,
  });
}
