export function parseOsc7(data: string): string | null {
  // file://host/path, with percent-encoding allowed in the path.
  const m = /^file:\/\/[^/]*(\/.*)$/.exec(data);

  if (!m) return null;

  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}
