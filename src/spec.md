# Pharmacy Inventory Manager

## Current State

The pharmacy inventory system currently includes:
- Medicine inventory with batch numbers, HSN codes, expiry dates, purchase/selling/MRP rates
- Doctor management with custom margin percentages
- Billing interface that adds items to cart and creates invoices
- GST calculation (5% of subtotal) split into SGST and CGST
- Invoice generation with professional A4 layouts
- Firm settings with name, address, GSTIN, contact, and shipping address
- Invoice deletion capability

**Current inventory behavior:**
- Medicines can be added with initial stock quantities
- Stock quantities remain static - they do NOT change when invoices are created
- The billing page shows available stock and prevents adding items that exceed current stock
- No tracking of stock movement or batch depletion

## Requested Changes (Diff)

### Add
1. **Automatic inventory deduction system:**
   - When an invoice is created, automatically reduce medicine stock quantities
   - Use FIFO (First In, First Out) logic - deduct from oldest batch first based on expiry date
   - Support negative inventory (allow overselling)
   - Display warning toast when billing would result in negative stock
   - Track remaining stock per batch

2. **Batch-aware inventory tracking:**
   - System must handle multiple batches of the same medicine
   - Each batch has its own expiry date and quantity
   - Deduct quantities from the oldest expiring batch first
   - If one batch is depleted, automatically deduct remainder from next oldest batch

### Modify
- **Backend `createInvoice` logic:**
  - After creating invoice, iterate through each billed item
  - Find all batches of that medicine sorted by expiry date (oldest first)
  - Deduct requested quantity from batches sequentially
  - Update medicine batch quantities in the backend state
  
- **Frontend billing interface:**
  - Add negative inventory warning before creating invoice
  - Check if any item would result in negative stock
  - Show warning toast but still allow invoice creation

### Remove
- None

## Implementation Plan

1. **Update backend (`generate_motoko_code`):**
   - Modify medicine data structure to support multiple batches per medicine name
   - Implement FIFO batch deduction logic in `createInvoice`:
     - Sort batches by expiry date ascending
     - Deduct quantity from oldest batch first
     - If batch quantity goes negative, continue to next batch
     - Update all affected batch quantities
   - Return updated medicine quantities after invoice creation

2. **Update frontend billing page:**
   - Before creating invoice, calculate total available stock across all batches
   - Check if any item quantity exceeds available stock
   - Show warning toast: "Warning: [Medicine name] will have negative inventory (-X units)"
   - Still allow invoice creation (don't block it)
   - After successful invoice creation, query backend to refresh medicine list

3. **Update inventory page display:**
   - Show total quantity across all batches for each medicine
   - Allow negative quantities to display (e.g., "-5 units")
   - Optionally highlight negative stock with warning badge

## UX Notes

- Users can oversell (negative inventory allowed) - this is intentional for scenarios where stock is expected to arrive
- Warning toasts inform users before creating invoices that would cause negative stock
- FIFO ensures oldest medicines are used first, reducing expiry waste
- Inventory page will reflect real-time stock after each invoice
- No manual stock adjustment needed - inventory only changes through billing
