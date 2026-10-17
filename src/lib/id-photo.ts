import { ID_PHOTO_MAX_BYTES } from "./entry-rules";

/**
 * Runs in the browser: shrinks a photo from the camera or gallery to a JPEG data URL small enough
 * to send on a weak connection (phone photos are often 3–8 MB). Keeps the text on the card readable.
 */
export async function shrinkPhoto(file: File): Promise<string> {
  const image = await decode(file);
  for (const [side, quality] of [
    [1600, 0.82],
    [1280, 0.75],
    [1024, 0.7],
    [800, 0.65],
  ] as const) {
    const blob = await toJpeg(image, side, quality);
    if (blob.size <= ID_PHOTO_MAX_BYTES) return toDataUrl(blob);
  }
  throw new Error("Photo is too large");
}

type Drawable = ImageBitmap | HTMLImageElement;

async function decode(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // some formats only decode through <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toJpeg(image: Drawable, maxSide: number, quality: number): Promise<Blob> {
  const w = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const h = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas is not available"));
  ctx.fillStyle = "#ffffff"; // transparent PNGs become white, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode the photo"))), "image/jpeg", quality),
  );
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the photo"));
    reader.readAsDataURL(blob);
  });
}
