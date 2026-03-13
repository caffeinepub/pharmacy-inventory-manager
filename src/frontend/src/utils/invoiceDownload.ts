/**
 * Captures an HTML element as a JPEG or PDF and triggers download.
 * Uses html2canvas for image capture and jsPDF for PDF generation.
 *
 * OKLCH fix: in onclone, we remove all external stylesheets from the cloned
 * document so CSS custom properties with oklch() are never resolved.
 * A safe fallback stylesheet with plain hex colors is injected instead.
 */

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options?: Record<string, unknown>,
    ) => Promise<HTMLCanvasElement>;
    jspdf?: {
      jsPDF: new (
        orientation: string,
        unit: string,
        format: string | number[],
      ) => JsPDFInstance;
    };
  }
}

interface JsPDFInstance {
  addImage(
    dataUrl: string,
    format: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void;
  save(filename: string): void;
  internal: { pageSize: { getWidth(): number; getHeight(): number } };
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
      if (window.html2canvas) resolve(window.html2canvas);
      else reject(new Error("html2canvas loaded but not available on window"));
    };
    script.onerror = () =>
      reject(new Error("Failed to load html2canvas from CDN"));
    document.head.appendChild(script);
  });
}

async function loadJsPDF(): Promise<JsPDFInstance> {
  if (window.jspdf?.jsPDF)
    return new window.jspdf.jsPDF("portrait", "mm", "a5");
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      if (window.jspdf?.jsPDF)
        resolve(new window.jspdf.jsPDF("portrait", "mm", "a5"));
      else reject(new Error("jsPDF loaded but not available on window"));
    };
    script.onerror = () => reject(new Error("Failed to load jsPDF from CDN"));
    document.head.appendChild(script);
  });
}

/** Safe stylesheet injected into the clone — no oklch, plain hex only. */
const SAFE_STYLESHEET = `
  html, body {
    background: white !important;
    color: black !important;
    font-family: Arial, Helvetica, sans-serif !important;
  }
  * {
    box-shadow: none !important;
    text-shadow: none !important;
    -webkit-print-color-adjust: exact !important;
  }
  table {
    border-collapse: collapse !important;
    table-layout: auto !important;
    width: 100% !important;
  }
  th, td {
    border: 1px solid black !important;
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
    vertical-align: middle !important;
    padding: 4px 5px !important;
    word-break: break-word !important;
    white-space: normal !important;
    box-sizing: border-box !important;
    color: black !important;
  }
  th {
    background-color: #e5e7eb !important;
    font-weight: 600 !important;
    font-size: 8px !important;
    text-align: center !important;
  }
  td { background-color: white !important; font-size: 8.5px !important; }
  tr { height: auto !important; }
  tfoot tr td { background-color: #f3f4f6 !important; }
  strong, b { color: black !important; }
  span { display: inline; overflow: visible; color: black !important; }
  div { overflow: visible !important; }
  .rupee-cell { display: flex !important; align-items: center !important; justify-content: center !important; gap: 1px !important; }
  .rupee-prefix { color: black !important; flex-shrink: 0 !important; }
  .invoice-container {
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
  }
`;

/**
 * Normalise all inline oklch() references on every element in the subtree,
 * and force text colour to black inside .invoice-container.
 */
function normalizeColors(element: HTMLElement): void {
  const allEls = element.querySelectorAll("*");
  for (const el of allEls) {
    if (!(el instanceof HTMLElement)) continue;
    const style = el.getAttribute("style") || "";
    if (style.includes("oklch")) {
      el.setAttribute("style", style.replace(/oklch\([^)]+\)/g, "#000"));
    }
    // Force black text inside the invoice
    if (el.closest(".invoice-container")) {
      el.style.color = "#000";
    }
    // Remove overflow:hidden from every element so nothing clips
    const computedOverflow = el.style.overflow;
    if (computedOverflow === "hidden") {
      el.style.overflow = "visible";
    }
  }
}

/**
 * Prepares a clean off-screen clone of the element for capture:
 * - Removes Save Changes button and logo images
 * - Replaces inputs/textareas with plain spans
 * - Removes style tags (oklch lives in them)
 */
function prepareClone(element: HTMLElement): {
  clone: HTMLElement;
  wrapper: HTMLDivElement;
  width: number;
} {
  const width = element.scrollWidth || element.offsetWidth;
  const clone = element.cloneNode(true) as HTMLElement;

  // Remove Save Changes button and print-hidden elements
  for (const el of clone.querySelectorAll(
    ".print\\:hidden, [class*='print:hidden']",
  ))
    el.remove();
  for (const btn of clone.querySelectorAll("button")) {
    if (
      btn.textContent?.toLowerCase().includes("save") ||
      btn.textContent?.toLowerCase().includes("saving")
    ) {
      const parent = btn.parentElement;
      if (parent && parent.tagName !== "TABLE" && parent.children.length === 1)
        parent.remove();
      else btn.remove();
    }
  }
  // Remove images and SVGs
  for (const img of clone.querySelectorAll("img")) img.remove();
  for (const svg of clone.querySelectorAll("svg")) svg.remove();

  // Remove style tags (these contain oklch)
  for (const s of clone.querySelectorAll("style")) s.remove();

  // Fix table layout and cell constraints
  for (const table of clone.querySelectorAll("table")) {
    (table as HTMLElement).style.tableLayout = "auto";
    (table as HTMLElement).style.width = "100%";
  }
  for (const cg of clone.querySelectorAll("colgroup")) cg.remove();
  for (const cell of clone.querySelectorAll("td, th")) {
    const el = cell as HTMLElement;
    el.style.height = "auto";
    el.style.overflow = "visible";
    el.style.whiteSpace = "normal";
    el.style.wordBreak = "break-word";
    el.style.verticalAlign = "middle";
    el.style.padding = "4px 5px";
    el.style.boxSizing = "border-box";
  }

  // Force the invoice-container itself to be height:auto
  const invoiceContainer = clone.querySelector(".invoice-container");
  if (invoiceContainer instanceof HTMLElement) {
    invoiceContainer.style.height = "auto";
    invoiceContainer.style.maxHeight = "none";
    invoiceContainer.style.overflow = "visible";
  }

  // Replace inputs with spans
  for (const input of clone.querySelectorAll("input")) {
    const span = document.createElement("span");
    span.textContent = (input as HTMLInputElement).value;
    Object.assign(span.style, {
      display: "inline",
      color: "black",
      fontFamily: "inherit",
      fontSize: "inherit",
      fontWeight: "inherit",
      lineHeight: "inherit",
      wordBreak: "break-word",
      whiteSpace: "normal",
      overflow: "visible",
    });
    input.replaceWith(span);
  }
  for (const ta of clone.querySelectorAll("textarea")) {
    const span = document.createElement("span");
    span.textContent = (ta as HTMLTextAreaElement).value;
    Object.assign(span.style, {
      display: "block",
      color: "black",
      fontFamily: "inherit",
      fontSize: "inherit",
      lineHeight: "1.5",
      wordBreak: "break-word",
      whiteSpace: "pre-wrap",
    });
    ta.replaceWith(span);
  }

  // Normalise colors and remove overflow:hidden from all elements
  normalizeColors(clone);

  // Strip any remaining inline oklch
  for (const el of [clone, ...Array.from(clone.querySelectorAll("*"))]) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.style.cssText?.includes("oklch")) {
      el.style.cssText = el.style.cssText
        .split(";")
        .filter((p) => !p.includes("oklch"))
        .join(";");
    }
  }

  // Build wrapper
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `position:fixed;top:-99999px;left:-99999px;width:${width}px;overflow:visible;z-index:-1;background:white;font-family:Arial,Helvetica,sans-serif;font-size:11px;`;
  clone.style.cssText = `width:${width}px;overflow:visible;background:white;color:black;position:relative;box-sizing:border-box;padding:20px 24px;height:auto;`;

  // Inject safe stylesheet
  const safeStyle = document.createElement("style");
  safeStyle.textContent = SAFE_STYLESHEET;
  clone.insertBefore(safeStyle, clone.firstChild);

  wrapper.appendChild(clone);
  return { clone, wrapper, width };
}

/** html2canvas onclone handler: strips external stylesheets so oklch vars are gone */
function onCloneHandler(clonedDoc: Document): void {
  // Remove ALL external link/style tags — this is the key oklch fix
  for (const link of Array.from(
    clonedDoc.querySelectorAll('link[rel="stylesheet"]'),
  ))
    link.remove();
  for (const style of Array.from(clonedDoc.querySelectorAll("style")))
    style.remove();

  // Inject safe stylesheet into cloned doc
  const safeStyle = clonedDoc.createElement("style");
  safeStyle.textContent = SAFE_STYLESHEET;
  clonedDoc.head.appendChild(safeStyle);

  // Force invoice-container height to auto
  const containers = clonedDoc.querySelectorAll(".invoice-container");
  for (const c of containers) {
    if (c instanceof HTMLElement) {
      c.style.height = "auto";
      c.style.maxHeight = "none";
      c.style.overflow = "visible";
    }
  }

  // Fix table cells in cloned doc
  for (const cell of clonedDoc.querySelectorAll("td, th")) {
    const el = cell as HTMLElement;
    el.style.height = "auto";
    el.style.overflow = "visible";
    el.style.whiteSpace = "normal";
    el.style.wordBreak = "break-word";
    el.style.padding = "4px 5px";
  }
  for (const tbl of clonedDoc.querySelectorAll("table")) {
    (tbl as HTMLElement).style.tableLayout = "auto";
  }

  // Remove overflow:hidden from all elements in cloned doc
  for (const el of Array.from(clonedDoc.querySelectorAll("*"))) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.style.overflow === "hidden") {
      el.style.overflow = "visible";
    }
    // Strip oklch from inline styles
    if (el.style.cssText?.includes("oklch")) {
      el.style.cssText = el.style.cssText
        .split(";")
        .filter((p) => !p.includes("oklch"))
        .join(";");
    }
  }
}

async function captureCanvas(
  element: HTMLElement,
): Promise<{ canvas: HTMLCanvasElement; width: number }> {
  const html2canvas = await loadHtml2Canvas();
  const { clone, wrapper, width } = prepareClone(element);
  document.body.appendChild(wrapper);
  void wrapper.offsetHeight; // force reflow

  // Wait a tick for layout to settle
  await new Promise((r) => setTimeout(r, 50));

  const naturalHeight = Math.max(
    clone.scrollHeight,
    clone.offsetHeight,
    clone.getBoundingClientRect().height,
    200, // minimum sensible height
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
      onclone: onCloneHandler,
    });
  } catch (err) {
    document.body.removeChild(wrapper);
    throw new Error(
      `Failed to capture invoice image: ${(err as Error).message}`,
    );
  }
  document.body.removeChild(wrapper);
  return { canvas, width };
}

/** Download invoice element as JPEG */
export async function downloadElementAsJpeg(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  if (!element) throw new Error("No element provided for download");
  const { canvas } = await captureCanvas(element);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
  if (!dataUrl || dataUrl === "data:,")
    throw new Error("Generated image is empty");
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Download invoice element as PDF (A5 portrait) */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  if (!element) throw new Error("No element provided for download");
  const { canvas } = await captureCanvas(element);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
  if (!dataUrl || dataUrl === "data:,")
    throw new Error("Generated image is empty");

  const pdf = await loadJsPDF();
  // A5 portrait: 148mm x 210mm
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  // Scale image to fit full width of A5
  const imgAspect = canvas.width / canvas.height;
  const imgHeightMm = pdfWidth / imgAspect;
  const yOffset = imgHeightMm < pdfHeight ? (pdfHeight - imgHeightMm) / 2 : 0;
  pdf.addImage(
    dataUrl,
    "JPEG",
    0,
    yOffset,
    pdfWidth,
    Math.min(imgHeightMm, pdfHeight),
  );
  pdf.save(filename);
}
