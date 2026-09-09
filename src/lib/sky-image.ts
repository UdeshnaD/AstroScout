import type { ImageAnalysis } from "./event-types";

export async function validateSkyImage(file: File) {
  if (
    !/\.(jpe?g|png)$/i.test(file.name) ||
    !["image/jpeg", "image/png"].includes(file.type)
  )
    throw new Error("Choose a JPG, JPEG or PNG image.");
  if (file.size === 0 || file.size > 20 * 1024 * 1024)
    throw new Error("The image must be non-empty and no larger than 20 MB.");
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
    (byte, i) => bytes[i] === byte,
  );
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (
    (file.type === "image/png" && !png) ||
    (file.type === "image/jpeg" && !jpeg)
  )
    throw new Error("The file contents do not match a supported image format.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "This image could not be decoded. Export it as JPG or PNG and try again.",
    );
  }
  try {
    if (bitmap.width * bitmap.height > 40000000)
      throw new Error("Choose an image smaller than 40 megapixels.");
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

export async function analyseSkyImage(
  file: File,
  signal: AbortSignal,
): Promise<ImageAnalysis> {
  await validateSkyImage(file);
  const bitmap = await createImageBitmap(file);
  let imageData: ImageData;
  try {
    if (signal.aborted) throw new Error("Analysis cancelled.");
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context)
      throw new Error("Image processing is unavailable in this browser.");
    context.fillStyle = "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  } finally {
    bitmap.close();
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker("/workers/sky-analysis.js");
    const finish = (result?: ImageAnalysis, error?: string) => {
      clearTimeout(timer);
      worker.terminate();
      signal.removeEventListener("abort", cancel);
      if (result) resolve(result);
      else reject(new Error(error ?? "OpenCV analysis failed."));
    };
    const cancel = () => finish(undefined, "Analysis cancelled.");
    const timer = window.setTimeout(
      () =>
        finish(
          undefined,
          "OpenCV timed out. Try a smaller image or reload the page.",
        ),
      45000,
    );
    signal.addEventListener("abort", cancel, { once: true });
    worker.onerror = () =>
      finish(undefined, "OpenCV could not start. Reload the page and retry.");
    worker.onmessage = ({
      data,
    }: MessageEvent<{ result?: ImageAnalysis; error?: string }>) =>
      finish(data.result, data.error);
    if (signal.aborted) {
      cancel();
      return;
    }
    worker.postMessage(
      {
        width: imageData.width,
        height: imageData.height,
        pixels: imageData.data.buffer,
      },
      [imageData.data.buffer],
    );
  });
}
