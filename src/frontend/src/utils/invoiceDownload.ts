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
 */
function stripOklchFromElement(root: HTMLElement): void {
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

  const elementsToProcess: Element[] = [root, ...Array.from(allElements)];

  for (const el of elementsToProcess) {
    if (!(el instanceof HTMLElement)) continue;
    for (const prop of styleProps) {
      const val = el.style.getPropertyValue(prop);
      if (val?.includes("oklch")) {
        el.style.removeProperty(prop);
      }
    }
    if (el.style.cssText?.includes("oklch")) {
      const parts = el.style.cssText.split(";");
      const safe = parts.filter((p) => !p.includes("oklch"));
      el.style.cssText = safe.join(";");
    }
  }
}

/**
 * Injects a safe override stylesheet into the wrapper so html2canvas
 * sees only browser-safe colors. Also ensures table cells are not clipped.
 */
function injectSafeStylesheet(container: HTMLElement): void {
  const safeStyle = document.createElement("style");
  safeStyle.textContent = `
    * {
      background-color: white;
      color: black;
      border-color: #cccccc;
      outline-color: #cccccc;
      box-shadow: none !important;
      text-shadow: none !important;
    }
    table {
      border-color: black !important;
      border-collapse: collapse !important;
      table-layout: auto !important;
      width: 100% !important;
    }
    th, td {
      border: 1px solid black !important;
      border-color: black !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      vertical-align: middle !important;
      padding: 4px 5px !important;
      word-break: break-word !important;
      white-space: normal !important;
      box-sizing: border-box !important;
    }
    th {
      background-color: #e5e7eb !important;
      color: black !important;
      font-weight: 600 !important;
      font-size: 8px !important;
      text-align: center !important;
    }
    td {
      background-color: white !important;
      color: black !important;
      font-size: 8.5px !important;
    }
    tr {
      height: auto !important;
    }
    tbody tr td {
      background-color: white !important;
    }
    tfoot tr, tfoot tr td {
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
    /* Ensure rupee prefix spans are inline */
    .rupee-cell {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 1px !important;
    }
    .rupee-prefix {
      color: black !important;
      flex-shrink: 0 !important;
    }
    span {
      display: inline !important;
      overflow: visible !important;
    }
  `;
  container.insertBefore(safeStyle, container.firstChild);
}

/**
 * Downloads a specific HTML element as a JPEG image.
 * - Hides Save Changes button and logo images in the output
 * - Ensures all product rows are fully captured inside the box
 * - Strips oklch colors for html2canvas compatibility
 * - Switches table-layout to auto so cells expand to fit content
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

  const width = element.scrollWidth || element.offsetWidth;

  // ---- Remove elements that must NOT appear in downloaded JPEG ----

  // 1. Remove Save Changes button and any print:hidden elements
  const printHiddenEls = clone.querySelectorAll(
    ".print\\:hidden, [class*='print:hidden']",
  );
  for (const el of printHiddenEls) {
    el.remove();
  }
  // Also find button containing "Save" or "Save Changes" text
  const allButtons = clone.querySelectorAll("button");
  for (const btn of allButtons) {
    if (
      btn.textContent?.toLowerCase().includes("save") ||
      btn.textContent?.toLowerCase().includes("saving")
    ) {
      const parent = btn.parentElement;
      if (
        parent &&
        parent.tagName !== "TABLE" &&
        parent.children.length === 1
      ) {
        parent.remove();
      } else {
        btn.remove();
      }
    }
  }

  // 2. Remove all logo/image elements
  const images = clone.querySelectorAll("img");
  for (const img of images) {
    img.remove();
  }
  // Remove SVG logos
  const svgs = clone.querySelectorAll("svg");
  for (const svg of svgs) {
    svg.remove();
  }

  // ---- Fix table-layout: auto so cells expand to fit their text ----
  const tables = clone.querySelectorAll("table");
  for (const table of tables) {
    (table as HTMLElement).style.tableLayout = "auto";
    (table as HTMLElement).style.width = "100%";
  }
  // Remove colgroup width constraints — auto layout will size columns to fit
  const colgroups = clone.querySelectorAll("colgroup");
  for (const cg of colgroups) {
    cg.remove();
  }
  // Ensure all table cells are unconstrained
  const allCells = clone.querySelectorAll("td, th");
  for (const cell of allCells) {
    const el = cell as HTMLElement;
    el.style.height = "auto";
    el.style.overflow = "visible";
    el.style.whiteSpace = "normal";
    el.style.wordBreak = "break-word";
    el.style.verticalAlign = "middle";
    el.style.padding = "4px 5px";
    el.style.boxSizing = "border-box";
  }

  // ---- Replace inputs/textareas with plain text so download looks clean ----
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
    span.style.overflow = "visible";
    input.replaceWith(span);
  }

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

  // Remove style elements that may contain oklch
  const styleElements = clone.querySelectorAll("style");
  for (const styleEl of styleElements) {
    styleEl.remove();
  }

  // ---- Build off-screen wrapper ----
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position: fixed;
    top: -99999px;
    left: -99999px;
    width: ${width}px;
    overflow: visible;
    z-index: -1;
    background: white;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
  `;
  clone.style.cssText = `
    width: ${width}px;
    overflow: visible;
    background: white;
    color: black;
    position: relative;
    box-sizing: border-box;
    padding: 20px 24px;
  `;

  wrapper.appendChild(clone);

  // Strip inline oklch styles
  stripOklchFromElement(clone);

  // Inject safe stylesheet (also fixes table cell overflow)
  injectSafeStylesheet(wrapper);

  document.body.appendChild(wrapper);

  // Force a reflow so the browser computes correct heights for all cells
  void wrapper.offsetHeight;

  // Measure natural height AFTER attaching to DOM (so layout is fully computed)
  const naturalHeight = Math.max(
    clone.scrollHeight,
    clone.offsetHeight,
    clone.getBoundingClientRect().height,
  );

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      width,
      height: naturalHeight,
      scrollX: 0,
      scrollY: 0,
      allowTaint: false,
      foreignObjectRendering: false,
      onclone: (clonedDoc: Document) => {
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
          // Fix table-layout in the final cloned doc too
          const clonedTables = clonedBody.querySelectorAll("table");
          for (const tbl of clonedTables) {
            (tbl as HTMLElement).style.tableLayout = "auto";
          }
          const clonedCells = clonedBody.querySelectorAll("td, th");
          for (const cell of clonedCells) {
            const el = cell as HTMLElement;
            el.style.height = "auto";
            el.style.overflow = "visible";
            el.style.whiteSpace = "normal";
            el.style.wordBreak = "break-word";
            el.style.padding = "4px 5px";
          }
          const safeStyle = clonedDoc.createElement("style");
          safeStyle.textContent = `
            * { background-color: white; color: black; border-color: #cccccc; box-shadow: none !important; }
            table { table-layout: auto !important; border-collapse: collapse !important; width: 100% !important; }
            th { background-color: #e5e7eb !important; font-weight: 600 !important; text-align: center !important; }
            th, td { border: 1px solid black !important; padding: 4px 5px !important; height: auto !important; overflow: visible !important; vertical-align: middle !important; word-break: break-word !important; white-space: normal !important; box-sizing: border-box !important; }
            tfoot tr, tfoot tr td { background-color: #f3f4f6 !important; }
            span { display: inline; overflow: visible; }
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
