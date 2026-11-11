export async function request(action, data) {
  const response = await fetch(`/api/v2?action=${encodeURIComponent(action)}`, {
    method: data ? "POST" : "GET",
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) {
    const text = await response.text();
    throw Error(
      text.length < 300 ? text : "Il server non è disponibile. Riprova.",
    );
  }
  return response.json();
}
