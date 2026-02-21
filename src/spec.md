# Pharmacy Inventory Manager

## Current State

The pharmacy inventory management system includes:
- Medicine inventory tracking with batch numbers, HSN codes, expiry dates, rates, and MRP
- Doctor management with custom margin percentages
- GST billing (5% on subtotal) with professional A4 invoice layouts
- Invoice list view with delete functionality
- Firm details and shipping address configuration in Settings
- No margin percentage displayed on printed invoices

**Known Issue**: In the Add/Edit Medicine dialog (InventoryPage.tsx) and Add/Edit Doctor dialog (DoctorsPage.tsx), the text input cursor jumps to another position after typing each character. This is caused by the controlled input pattern with object spreading in onChange handlers, which triggers unnecessary re-renders.

## Requested Changes (Diff)

### Add
- None

### Modify
- **InventoryPage.tsx**: Fix input cursor jumping issue in medicine form by optimizing the onChange handlers to prevent unnecessary re-renders
- **DoctorsPage.tsx**: Fix input cursor jumping issue in doctor form by optimizing the onChange handlers to prevent unnecessary re-renders

### Remove
- None

## Implementation Plan

1. Update InventoryPage.tsx medicine form inputs to use functional setState updates instead of object spreading
2. Update DoctorsPage.tsx doctor form inputs to use functional setState updates instead of object spreading
3. Ensure all text inputs maintain cursor position during continuous typing
4. Validate the fix by testing continuous typing in all form fields

## UX Notes

After this fix, users will be able to type continuously in all medicine and doctor form fields without the cursor jumping or pausing between characters. This significantly improves the data entry experience.
