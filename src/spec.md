# Pharmacy Inventory Manager

## Current State

The pharmacy inventory management system currently:
- Calculates GST as 5% of the subtotal (base selling price × quantity)
- Splits GST into SGST (2.5%) and CGST (2.5%) in the backend
- Displays GST amounts in the billing interface and printed invoices
- Uses standard JavaScript/TypeScript number precision for all calculations

**GST Calculation Flow:**
1. Frontend (BillingPage.tsx): Calculates amount, GST (5%), SGST/CGST split, and total for preview
2. Backend: Receives item names and quantities, recalculates everything including GST based on medicine rates and doctor margins
3. Frontend (InvoicesPage.tsx): Displays stored invoice data including GST amounts

**Current GST Display:**
- Billing interface shows precise GST amounts (e.g., ₹15.75)
- Printed invoices show precise GST amounts (e.g., ₹15.75)
- No rounding is applied to GST values

## Requested Changes (Diff)

### Add
- Standard mathematical rounding for GST amount in printed invoices only
- Rounding logic: decimals < 0.5 round down, ≥ 0.5 round up (e.g., 15.2 → 15, 15.7 → 16)

### Modify
- **InvoicesPage.tsx invoice display section**: Apply `Math.round()` to GST amounts when rendering the printed invoice
- **Grand total calculation in invoice**: Use the rounded GST value to calculate the grand total (subtotal + rounded GST)
- Keep the billing interface (BillingPage.tsx) unchanged - it continues to show unrounded GST for accurate preview

### Remove
- None

## Implementation Plan

1. **Update InvoicesPage.tsx**:
   - In the printed invoice section (inside the Dialog), apply `Math.round()` to GST calculations
   - Calculate rounded GST: `Math.round(Number(selectedInvoice.totalSgst) + Number(selectedInvoice.totalCgst))`
   - Recalculate grand total using rounded GST: `Number(selectedInvoice.totalAmount) + roundedGst`
   - Apply rounding to both:
     - Individual item GST display in the invoice table
     - Total GST in the footer row
     - Summary section GST and grand total
   - Keep the invoice list view (non-printed) showing original values from backend

2. **Verify calculations**:
   - Subtotal = sum of all item amounts (rate × quantity)
   - Rounded GST = `Math.round(subtotal × 0.05)`
   - Grand total = subtotal + rounded GST

3. **No backend changes required**: Backend stores precise GST values, rounding happens only in the invoice display layer

## UX Notes

- **User visibility**: Rounding only affects the final printed invoice, not the billing preview or invoice list
- **Transparency**: The billing interface continues to show precise GST calculations for accuracy during cart building
- **Compliance**: Standard mathematical rounding ensures GST amounts are whole rupees in final customer-facing documents
- **Consistency**: All printed invoices will display rounded GST values, making totals easier to read and process
