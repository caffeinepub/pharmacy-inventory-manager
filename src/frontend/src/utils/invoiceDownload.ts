/**
 * Captures an HTML element as a JPEG image and triggers download.
 * Uses a dynamically loaded html2canvas from CDN, or falls back to window.print().
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
    script.onload = () => resolve(window.html2canvas);
    script.onerror = () => reject(new Error("Failed to load html2canvas"));
    document.head.appendChild(script);
  });
}

export async function downloadElementAsJpeg(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const html2canvas = await loadHtml2Canvas();
  if (!html2canvas) throw new Error("html2canvas could not be loaded");

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
