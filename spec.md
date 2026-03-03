# Pharmacy Inventory Manager

## Current State
- App uses a dark professional theme (dark navy/charcoal background, teal accents) applied via the `.dark` class or direct dark CSS overrides
- Invoice preview (in both BillingPage and InvoicesPage) shows a static read-only display of all invoice fields
- GST is calculated automatically and displayed as a read-only value
- All invoice fields (firm name, doctor, date, invoice number, item rows, GST, totals) are not editable

## Requested Changes (Diff)

### Add
- Inline editing capability for all invoice fields in the preview modal:
  - Header fields: firm name, address, GSTIN, DIL No, contact, shipping address
  - Invoice meta: invoice number, date, doctor name
  - Per-item fields: medicine name, batch number, expiry date, HSN code, quantity, rate, MRP
  - GST amount (editable, overrides auto-calculation)
  - Subtotal (auto-calculated from items; grand total = subtotal + GST)
- Tap-to-edit pattern: fields display as plain text normally, show input on tap/click
- When GST is edited manually, grand total recalculates as subtotal + edited GST

### Modify
- Revert theme from dark professional back to light/white (as it was in version 30)
- Remove `dark` class from html/body/root if present; ensure index.css light tokens are active
- Both BillingPage invoice preview and InvoicesPage invoice view should have editable fields

### Remove
- Dark theme class/forced dark mode styling from App root

## Implementation Plan
1. Remove dark class from App.tsx html root (if present); verify index.css light tokens are default
2. In InvoicesPage: convert invoice preview to use local editable state; each cell becomes a click-to-edit input
3. In BillingPage: same editable invoice pattern for the print preview modal
4. GST field: editable number input; grand total = subtotal + gst (recalculated live)
5. Per-item amounts auto-recalculate when qty or rate are edited
6. Validate: typecheck, lint, build pass
