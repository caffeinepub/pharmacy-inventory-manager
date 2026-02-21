# Pharmacy Inventory Manager

## Current State

The pharmacy management system currently includes:

**Backend (Motoko)**
- Medicine management with batch numbers, HSN codes, expiry dates, purchase/selling rates, MRP
- Doctor management with custom margin percentages
- Invoice generation with GST calculations (5% split into 2.5% SGST + 2.5% CGST)
- Firm settings with business and shipping addresses
- InvoiceItem type stores: medicineName, batchNumber, hsnCode, quantity, rate, amount, marginPercentage, sgst, cgst, totalAmount
- No expiry date field in InvoiceItem type
- No delete functionality for invoices

**Frontend**
- Dashboard with total stock value calculation
- Inventory management page
- Doctors management page
- Billing page with GST invoice generation
- Invoices list page (displays all invoices, no delete option)
- Settings page with firm details and shipping address

## Requested Changes (Diff)

### Add
- Expiry date field to InvoiceItem type in backend
- Delete button for each invoice in the invoices list page
- deleteInvoice backend function to remove invoices by invoice number

### Modify
- Backend: Update InvoiceItem type to include expiryDate field
- Backend: Update createInvoice function to capture and store medicine expiry date in invoice items
- Frontend: Update invoice display/print layout to show expiry date for each item
- Frontend: Add delete button with confirmation dialog for each invoice in InvoicesPage

### Remove
- Nothing to remove

## Implementation Plan

1. **Backend Updates**
   - Add `expiryDate : Text` field to InvoiceItem type
   - Update createInvoice function to include `expiryDate = medicine.expiryDate` when building invoice items
   - Add `deleteInvoice(invoiceNumber : Nat)` function to remove invoices from the map

2. **Frontend Updates**
   - Update invoice display components to show expiry date column/field for each medicine item
   - Add delete button (trash icon) next to each invoice in the invoices list
   - Implement confirmation dialog before deleting an invoice
   - Wire delete button to backend deleteInvoice function
   - Refresh invoice list after successful deletion

## UX Notes

- Expiry date will appear in the invoice items table alongside batch number and HSN code
- Delete button should have a confirmation dialog to prevent accidental deletions
- After deleting an invoice, the list should refresh automatically to reflect the change
- Invoice numbers remain sequential even after deletions (no renumbering)
