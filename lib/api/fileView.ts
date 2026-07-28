import { fileViewUrl } from "@/lib/auth/profile";

/** Fetch a stored attachment through the same-origin proxy and return a blob:
 * URL suitable for `<img>` / `<iframe>` preview. Returns null on failure. */
export async function fetchFileViewObjectUrl(
  raw: string,
  accept = "image/*,application/pdf,*/*",
): Promise<string | null> {
  const url = fileViewUrl(raw);
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url, {
      credentials: "include",
      headers: { accept },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (/json/i.test(ct)) return null;
    const blob = await res.blob();
    if (!blob.size) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}
