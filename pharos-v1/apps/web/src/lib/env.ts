const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
const isDevelopment = process.env.NODE_ENV === "development";

export const API_BASE_URL = configuredApiUrl || (isDevelopment ? "http://localhost:4000" : "");

export function getApiBaseUrlError(): string | null {
  if (API_BASE_URL) {
    return null;
  }
  return "NEXT_PUBLIC_API_URL is required in production.";
}
