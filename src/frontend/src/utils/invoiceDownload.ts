/**
 * Captures an HTML element as a JPEG image and triggers download.
 * The captured output matches the on-screen preview exactly.
 * Uses a cloned node rendered off-screen to avoid Dialog/modal clipping issues.
 *
 * IMPORTANT: This utility strips all oklch() color references from the clone
 * before passing to html2canvas, which does not support oklch().
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
        onclone?: (clonedDoc: Document) => void;
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
 * Strips oklch color references from all elements in a subtree.
 * html2canvas does not support the oklch() color function.
 * This walks every element and removes any inline style property
 * that contains 'oklch', then injects a safe stylesheet override.
 */
function stripOklchFromElement(root: HTMLElement): void {
  // Walk all elements and clear inline oklch style properties
  const allElements = root.querySelectorAll("*");
  const styleProps = [
    "color",
    "background",
    "background-color",
    "border-color",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "outline-color",
    "text-decoration-color",
    "fill",
    "stroke",
    "box-shadow",
  ];

  // Also process root itself
  const elementsToProcess: Element[] = [root, ...Array.from(allElements)];

  for (const el of elementsToProcess) {
    if (!(el instanceof HTMLElement)) continue;
    for (const prop of styleProps) {
      const val = el.style.getPropertyValue(prop);
      if (val?.includes("oklch")) {
        el.style.removeProperty(prop);
      }
    }
    // Also check the full cssText for oklch
    if (el.style.cssText?.includes("oklch")) {
      // Parse and rebuild without oklch properties
      const parts = el.style.cssText.split(";");
      const safe = parts.filter((p) => !p.includes("oklch"));
      el.style.cssText = safe.join(";");
    }
  }
}

/**
 * Injects a safe override stylesheet into the wrapper so html2canvas
 * sees only browser-safe colors. This covers Tailwind utility classes
 * that use oklch CSS variables.
 */
function injectSafeStylesheet(container: HTMLElement): void {
  const safeStyle = document.createElement("style");
  safeStyle.textContent = `
    * {
      background-color: white !important;
      color: black !important;
      border-color: #cccccc !important;
      outline-color: #cccccc !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
    table {
      border-color: black !important;
    }
    th, td {
      border-color: black !important;
    }
    th {
      background-color: #e5e7eb !important;
      color: black !important;
    }
    tfoot tr {
      background-color: #f3f4f6 !important;
    }
    tfoot tr td {
      background-color: #f3f4f6 !important;
    }
    .text-green-600, .text-green-700 {
      color: #16a34a !important;
    }
    .text-red-600, .text-destructive {
      color: #dc2626 !important;
    }
    .bg-white {
      background-color: #ffffff !important;
    }
    .text-black {
      color: #000000 !important;
    }
    strong, b {
      color: black !important;
    }
  `;
  container.insertBefore(safeStyle, container.firstChild);
}

/**
 * Downloads a specific HTML element as a JPEG image.
 * Clones the element into a hidden off-screen container so modal/dialog
 * overflow clipping does not interfere with the capture.
 * Strips all oklch() color references so html2canvas can render correctly.
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
    font-family: ${originalStyles.fontFamily || "Arial, Helvetica, sans-serif"};
    font-size: ${originalStyles.fontSize || "11px"};
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
    span.style.display = "block";
    span.style.color = "black";
    span.style.fontFamily = "inherit";
    span.style.fontSize = "inherit";
    span.style.lineHeight = "1.5";
    span.style.wordBreak = "break-word";
    span.style.whiteSpace = "pre-wrap";
    textarea.replaceWith(span);
  }

  // CRITICAL: Remove all style elements (Tailwind CSS) from the clone
  // that contain oklch references — these crash html2canvas
  const styleElements = clone.querySelectorAll("style");
  for (const styleEl of styleElements) {
    styleEl.remove();
  }

  wrapper.appendChild(clone);

  // Strip inline oklch styles from all elements
  stripOklchFromElement(clone);

  // Inject a safe stylesheet override AFTER stripping (so it wins)
  injectSafeStylesheet(wrapper);

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
      onclone: (clonedDoc: Document) => {
        // Extra pass: strip any remaining oklch from the cloned document
        const clonedBody = clonedDoc.body;
        if (clonedBody) {
          const allInClone = clonedBody.querySelectorAll("*");
          for (const el of allInClone) {
            if (!(el instanceof HTMLElement)) continue;
            if (el.style.cssText?.includes("oklch")) {
              const parts = el.style.cssText.split(";");
              const safe = parts.filter((p) => !p.includes("oklch"));
              el.style.cssText = safe.join(";");
            }
          }
          // Also inject safe styles into cloned document head
          const safeStyle = clonedDoc.createElement("style");
          safeStyle.textContent = `
            * { background-color: white !important; color: black !important; border-color: #cccccc !important; box-shadow: none !important; }
            th { background-color: #e5e7eb !important; }
            tfoot tr, tfoot tr td { background-color: #f3f4f6 !important; }
          `;
          clonedDoc.head.appendChild(safeStyle);
        }
      },
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
