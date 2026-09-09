/* All pixels originate from a visitor upload. No object recognition is performed. */
let runtime;
async function openCv() {
  if (!runtime) {
    importScripts("/vendor/opencv.js");
    runtime = Promise.resolve(self.cv).then((cv) => {
      if (cv.Mat) return cv;
      return new Promise((resolve) => {
        cv.onRuntimeInitialized = () => resolve(cv);
      });
    });
  }
  return runtime;
}
self.onmessage = async ({ data }) => {
  const allocated = [];
  const own = (value) => {
    allocated.push(value);
    return value;
  };
  try {
    const cv = await openCv();
    const { width, height, pixels } = data;
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width * height > 1280 * 1280 ||
      pixels.byteLength !== width * height * 4
    )
      throw new Error("Invalid image dimensions.");
    const source = own(
      cv.matFromImageData({
        width,
        height,
        data: new Uint8ClampedArray(pixels),
      }),
    );
    const gray = own(new cv.Mat());
    const rgb = own(new cv.Mat());
    const hsv = own(new cv.Mat());
    const laplacian = own(new cv.Mat());
    const edges = own(new cv.Mat());
    const dark = own(new cv.Mat());
    const mean = own(new cv.Mat());
    const deviation = own(new cv.Mat());
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(source, rgb, cv.COLOR_RGBA2RGB);
    cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV);
    cv.meanStdDev(gray, mean, deviation);
    const brightness = mean.data64F[0];
    const contrast = deviation.data64F[0];
    cv.Laplacian(gray, laplacian, cv.CV_64F);
    cv.meanStdDev(laplacian, mean, deviation);
    const laplacianVariance = deviation.data64F[0] ** 2;
    cv.threshold(gray, dark, 40, 255, cv.THRESH_BINARY_INV);
    cv.Canny(gray, edges, 50, 150);
    const count = width * height;
    const darkPixelPercent = (100 * cv.countNonZero(dark)) / count;
    const edgePercent = (100 * cv.countNonZero(edges)) / count;
    let cloudCandidates = 0;
    for (let i = 0; i < count; i++) {
      // Neutral, moderately bright pixels can be clouds OR buildings/glare.
      if (
        hsv.data[i * 3 + 1] < 60 &&
        hsv.data[i * 3 + 2] > 80 &&
        hsv.data[i * 3 + 2] < 245
      )
        cloudCandidates++;
    }
    const contours = own(new cv.MatVector());
    const hierarchy = own(new cv.Mat());
    cv.findContours(
      dark,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE,
    );
    let largest = 0;
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      try {
        largest = Math.max(largest, cv.contourArea(contour));
      } finally {
        contour.delete();
      }
    }
    const largestDarkRegionPercent = (100 * largest) / count;
    const warnings = [];
    if (brightness < 15)
      warnings.push(
        "Very dark exposure: cloud and obstruction estimates are unreliable.",
      );
    if (brightness > 235)
      warnings.push(
        "Very bright exposure: substantial highlight clipping is possible.",
      );
    if (laplacianVariance < 50)
      warnings.push(
        "Low detail: blur, a smooth sky or underexposure could explain this result.",
      );
    if (largestDarkRegionPercent > 35)
      warnings.push(
        "A large dark region may be an obstruction or clear dark sky; inspect the preview.",
      );
    if (edgePercent > 15)
      warnings.push(
        "Dense edges may indicate buildings, foliage or noise; this is not confirmed obstruction.",
      );
    if (Math.min(width, height) < 200)
      warnings.push("Small image: limited spatial detail.");
    const round = (value) => Math.round(value * 100) / 100;
    self.postMessage({
      result: {
        source: "OpenCV analysis of uploaded image",
        version: "1.0",
        analysedAt: new Date().toISOString(),
        width,
        height,
        brightness: round(brightness),
        contrast: round(contrast),
        laplacianVariance: round(laplacianVariance),
        darkPixelPercent: round(darkPixelPercent),
        cloudCandidatePercent: round((100 * cloudCandidates) / count),
        edgePercent: round(edgePercent),
        largestDarkRegionPercent: round(largestDarkRegionPercent),
        suitability: warnings.length ? "limited" : "pixel analysis available",
        warnings,
      },
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "OpenCV analysis failed.",
    });
  } finally {
    for (const value of allocated.reverse()) value.delete();
  }
};
