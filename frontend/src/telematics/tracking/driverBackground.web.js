export async function backgroundAvailable() {
  return false;
}
export async function startBackground() {
  throw new Error(
    "Background location is unavailable in a browser. Use foreground sharing.",
  );
}
export async function stopBackground() {}

export async function startNavigationBackground() { throw new Error('Background guidance requires the native DriverApp.'); }
export async function stopNavigationBackground() {}
