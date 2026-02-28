# Pharmacy Inventory Manager

## Current State
- App uses a light healthcare theme (clinical teal) with OKLCH tokens in index.css
- The `html` element has no `dark` class applied; `App.tsx` does not toggle dark mode
- Invoice preview/print in both `BillingPage.tsx` and `InvoicesPage.tsx` shows: S.No, Medicine Name, Batch, Expiry, HSN Code, Qty, Rate, Amount, GST 5%, Total
- `InvoiceItem` type does NOT have an `mrp` field; MRP lives on the `Medicine` type
- Both invoice components already receive `doctors` list; medicines list is also available in BillingPage

## Requested Changes (Diff)

### Add
- Dark Professional theme as the default/active theme by adding `class="dark"` to the `<html>` element
- MRP column in the invoice items table (in both BillingPage print preview and InvoicesPage invoice view)
- MRP lookup: since `InvoiceItem` doesn't have MRP, look it up from the medicines list using `medicineName`; if not found, show "N/A"

### Modify
- `index.css` or `main.tsx`/`App.tsx`: ensure the `dark` class is applied on `<html>` so dark OKLCH variables activate
- Both invoice tables in `BillingPage.tsx` and `InvoicesPage.tsx`: add MRP column between "Rate" and "Amount" columns
- `InvoicesPage.tsx`: import and use `useGetAllMedicines` to resolve MRP per invoice item

### Remove
- Nothing removed

## Implementation Plan
1. Apply `dark` class to `<html>` element in `index.html` or via `main.tsx` so the existing dark OKLCH tokens activate globally
2. In `BillingPage.tsx` invoice preview: add `useGetAllMedicines` hook, add "MRP" column header, display MRP per item by looking up medicine from the medicines list; update colSpan in tfoot accordingly
3. In `InvoicesPage.tsx` invoice view: add `useGetAllMedicines` hook, add "MRP" column header, display MRP per item by looking up from medicines list; update colSpan in tfoot accordingly
