// Analytics receives only anonymous view paths; never query parameters or hashes.
export function sanitizeAnalyticsEvent(event) {
  try {
    const url = new URL(event.url);
    url.search = "";
    url.hash = "";
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}
