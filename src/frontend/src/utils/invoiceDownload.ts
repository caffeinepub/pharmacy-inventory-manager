/**
 * Captures an HTML element as a JPEG image and triggers download.
 * The captured output matches the on-screen preview exactly.
 * Uses a cloned node rendered off-screen to avoid Dialog/modal clipping issues.
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
        scrollX?: number;
        scrollY?: number;
        x?: number;
        y?: number;
        foreignObjectRendering?: boolean;
        removeContainer?: boolean;
        allowTaint?: boolean;
      },
    ) => Promise<HTMLCanvasElement>;
  }
}

async function loadHtml2Canvas(): Promise<
  NonNullable<typeof window.html2canvas>
> {
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
 * Clones the element into a hidden off-screen container so modal/dialog
 * overflow clipping does not interfere with the capture.
 */
export async function downloadElementAsJpeg(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  if (!element) {
    throw new Error("No element provided for download");
  }

  let html2canvas: NonNullable<typeof window.html2canvas>;
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

  // Clone the element into an off-screen container so modal overflow/transform
  // does not clip the captured content.
  const clone = element.cloneNode(true) as HTMLElement;

  // Copy computed styles from original to ensure the clone looks identical
  const originalStyles = window.getComputedStyle(element);
  const width = element.scrollWidth || element.offsetWidth;
  const height = element.scrollHeight || element.offsetHeight;

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position: fixed;
    top: -99999px;
    left: -99999px;
    width: ${width}px;
    height: ${height}px;
    overflow: visible;
    z-index: -1;
    background: white;
    font-family: ${originalStyles.fontFamily};
    font-size: ${originalStyles.fontSize};
  `;
  clone.style.cssText = `
    width: ${width}px;
    height: ${height}px;
    overflow: visible;
    background: white;
    color: black;
    position: relative;
    box-sizing: border-box;
  `;

  // Hide all inline-edit inputs in the clone and replace with plain text spans
  // so the download looks exactly like the printed preview (no input borders)
  const inputs = clone.querySelectorAll("input");
  for (const input of inputs) {
    const span = document.createElement("span");
    span.textContent = input.value;
    span.style.cssText = input.style.cssText;
    span.style.display = "inline";
    span.style.color = "black";
    span.style.fontFamily = "inherit";
    span.style.fontSize = "inherit";
    span.style.fontWeight = "inherit";
    span.style.lineHeight = "inherit";
    span.style.wordBreak = "break-word";
    span.style.whiteSpace = "normal";
    input.replaceWith(span);
  }

  // Replace textareas too
  const textareas = clone.querySelectorAll("textarea");
  for (const textarea of textareas) {
    const span = document.createElement("span");
    span.textContent = textarea.value;
    span.style.cssText = textarea.style.cssText;
    span.style.display = "block";
    span.style.color = "black";
    span.style.fontFamily = "inherit";
    span.style.fontSize = "inherit";
    span.style.lineHeight = "1.5";
    span.style.wordBreak = "break-word";
    span.style.whiteSpace = "pre-wrap";
    textarea.replaceWith(span);
  }

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      width,
      height,
      scrollX: 0,
      scrollY: 0,
      allowTaint: false,
      foreignObjectRendering: false,
    });
  } catch (captureError) {
    document.body.removeChild(wrapper);
    throw new Error(
      `Failed to capture invoice image: ${(captureError as Error).message}`,
    );
  }

  document.body.removeChild(wrapper);

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
