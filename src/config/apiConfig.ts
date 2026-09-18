// Frontend API Base URL Configuration
// For web builds (bga.aaditechs.in), this defaults to '' (same-origin relative URLs).
// For Capacitor Android builds, VITE_API_BASE_URL is configured (e.g. https://bga.aaditechs.in)
// so that API calls are directed to the live backend rather than the local Capacitor webview.

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) || '';
