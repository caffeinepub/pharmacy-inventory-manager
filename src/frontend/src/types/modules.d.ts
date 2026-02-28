declare module "html-to-image" {
  export function toJpeg(
    node: HTMLElement,
    options?: { quality?: number; backgroundColor?: string },
  ): Promise<string>;
  export function toPng(
    node: HTMLElement,
    options?: { quality?: number; backgroundColor?: string },
  ): Promise<string>;
  export function toBlob(
    node: HTMLElement,
    options?: { quality?: number; backgroundColor?: string },
  ): Promise<Blob | null>;
}
