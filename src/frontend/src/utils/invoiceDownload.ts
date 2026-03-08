/**
 * Captures an HTML element as a JPEG image and triggers download.
 * The captured output matches the on-screen preview exactly — no scaling to A4.
 */

// Type declaration for dynamically loaded html2canvas
declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options?: {
        scale?: number;
        backgroundColor?: string;
        useCORS?: boolean;
        logging?: boolean;
        width?: number;
        height?: number;
        windowWidth?: number;
        windowHeight?: number;
      },
    ) => Promise<HTMLCanvasElement>;
  }
}

async function loadHtml2Canvas(): Promise<typeof window.html2canvas> {
  if (window.html2canvas) return window.html2canvas;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      if (window.html2canvas) {
        resolve(window.html2canvas);
      } else {
        reject(new Error("html2canvas loaded but not available on window"));
      }
    };
    script.onerror = () =>
      reject(new Error("Failed to load html2canvas from CDN"));
    document.head.appendChild(script);
  });
}

/**
 * Downloads a specific HTML element as a JPEG image.
 * Captures the element at its actual rendered size — no stretching or scaling to A4.
 */
export async function downloadElementAsJpeg(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  if (!element) {
    throw new Error("No element provided for download");
  }

  let html2canvas: typeof window.html2canvas;
  try {
    html2canvas = await loadHtml2Canvas();
  } catch (loadError) {
    throw new Error(
      `Could not load image capture library: ${(loadError as Error).message}`,
    );
  }

  if (!html2canvas) {
    throw new Error("Image capture library failed to initialize");
  }

  // Get exact rendered dimensions of the element
  const rect = element.getBoundingClientRect();
  const elementWidth = rect.width || element.offsetWidth;
  const elementHeight = rect.height || element.offsetHeight;

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale: 2, // 2× for sharp output
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      width: elementWidth,
      height: elementHeight,
      windowWidth: elementWidth,
      windowHeight: elementHeight,
    });
  } catch (captureError) {
    throw new Error(
      `Failed to capture invoice image: ${(captureError as Error).message}`,
    );
  }

  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
  if (!dataUrl || dataUrl === "data:,") {
    throw new Error("Generated image is empty");
  }

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
