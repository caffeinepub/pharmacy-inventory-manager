# Pharmacy Inventory Manager

## Current State
- Full pharmacy inventory management with medicine stock, doctor management, billing, invoices, ledger, dashboard
- Inventory page has `OpeningStockDialog` with `ScrollArea` but may have scrollbar visibility issues
- Doctor pricing dialog shows Medicine Name and Base Selling Rate columns only
- Invoice print uses `window.print()` which sometimes doesn't match the preview layout exactly

## Requested Changes (Diff)

### Add
- Purchase Price (₹) and MRP (₹) columns in the Manage Pricing dialog for doctors

### Modify
- `OpeningStockDialog` in InventoryPage: ensure the ScrollArea has a visible scrollbar (add `ScrollBar` component)
- `DoctorsPage` Manage Pricing table: add Purchase Rate and MRP columns from medicine data
- `InvoicesPage` print functionality: use a dedicated print stylesheet that exactly matches the preview layout, using CSS `@media print` with a dedicated print area

### Remove
- Nothing

## Implementation Plan
1. **InventoryPage.tsx** - `OpeningStockDialog`: Add `<ScrollBar orientation="vertical" />` inside the `ScrollArea` to make the scrollbar always visible
2. **DoctorsPage.tsx** - Manage Pricing table: Add `Purchase Rate` and `MRP` columns in both `<TableHead>` and `<TableRow>` using `medicine.purchaseRate` and `medicine.mrp` data
3. **InvoicesPage.tsx** - Fix the print CSS so the invoice prints exactly matching the preview: adjust the print styles to use the dialog's content width, ensure the invoice container is properly positioned and all elements are visible during print
