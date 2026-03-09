# Pharmacy Inventory Manager

## Current State
- Full-stack pharmacy app with inventory, billing, doctor management, invoices, ledger, dashboard, and settings.
- InvoicePreview.tsx: editable invoice with inline inputs; download uses html2canvas + invoiceDownload.ts utility.
- LedgerPage.tsx: shows doctor-wise ledger with invoice history and payment recording per invoice.
- Invoice table columns: S.No, Medicine Name, Batch, Expiry, HSN, Qty, Rate, MRP, Amt, GST, Total.
- Invoice footer has subtotal and grand total in a summary box (two rows stacked).
- invoiceDownload.ts: clones element, replaces inputs with spans, captures with html2canvas.
- index.css uses OKLCH color variables; tailwind.config.ts maps all colors to oklch(var(--...)) — this causes html2canvas to fail with "Attempting to parse an unsupported color function oklch".

## Requested Changes (Diff)

### Add
- Ledger print button: Print the ledger for a selected doctor (full ledger history + payment history per invoice) as a formatted printable layout.
- Ledger save as JPG: Download a doctor's ledger (with all invoice history and payment history) as a JPEG file.
- Rupee symbol (₹) prefix in invoice table cells for Rate, MRP, Amt (Amount), and GST columns — both in headers and cell values.

### Modify
- invoiceDownload.ts: Before html2canvas capture, walk all stylesheets and inline styles, resolve oklch() values by mapping CSS variables to actual hex/rgb values, then inject a `<style>` override that replaces all oklch() calls with standard RGB equivalents so html2canvas can parse them. Also patch the cloned element's inline styles and computed background-color / color properties.
- Invoice table alignment: S.No centered; HSN code, Qty, Rate, MRP, Amt, GST, Total columns all center-aligned (both header and data cells).
- Invoice footer: Show Subtotal and Grand Total on a single line (flexbox row with space-between), not stacked.
- Invoice columns: ensure all content is fully visible — adequate minimum widths, word-break, no overflow hidden.
- LedgerPage.tsx: Add Print and Download as JPG buttons to the doctor detail view (alongside existing back button area). Create a printable ledger layout (LedgerPrint component) that shows: doctor name, firm name, summary cards (total credit / paid / outstanding), full invoice history table, and inline payment history for each invoice.

### Remove
- Nothing removed.

## Implementation Plan
1. Fix invoiceDownload.ts: add oklch-to-rgb CSS variable resolution before html2canvas capture. Map all CSS variables from :root to their hex values, then inject a <style> block into the clone that overrides oklch() calls with safe fallback colors.
2. Update InvoicePreview.tsx invoice table:
   - Center-align S.No, HSN, Qty, Rate, MRP, Amt, GST, Total headers and cells.
   - Add ₹ prefix to Rate, MRP, Amt (Amount), GST column headers and display values.
   - Fix invoice footer summary: put Subtotal and Grand Total on one line (flex row).
   - Ensure all cells have min-width and overflow visible.
3. Update LedgerPage.tsx:
   - Add a printable ledger layout component (inline, styled for print with all black text).
   - Add Print button that calls window.print() with print CSS targeting the ledger container.
   - Add Download as JPG button that captures the ledger container via downloadElementAsJpeg.
   - Show full payment history expanded in the print/download view.
