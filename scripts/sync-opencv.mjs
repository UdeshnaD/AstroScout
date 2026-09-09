import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const destination = new URL("../public/vendor/", import.meta.url);
await mkdir(destination, { recursive: true });
await copyFile(
  require.resolve("@techstark/opencv-js"),
  new URL("opencv.js", destination),
);
console.log("Local OpenCV runtime ready.");
