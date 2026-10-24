export async function backgroundAvailable() {
  return false;
}
export async function startBackground() {
  throw new Error(
    "Background location is unavailable in a browser. Use foreground sharing.",
  );
}
export async function stopBackground() {}
