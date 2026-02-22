# Pharmacy Inventory Manager

## Current State

The pharmacy system currently has:
- Medicine inventory management with batch tracking, HSN codes, and expiry dates
- Doctor management with custom margin percentages
- Billing system with GST (5%) calculation and invoice generation
- Settings page with firm details (name, address, GSTIN, contact, email, shipping address)
- Invoice display with all relevant details

**Known Issue**: Input fields in medicine forms, doctor forms, and billing page experience cursor jumping during typing, causing the cursor to move to another position after each letter, making data entry very difficult.

**Missing Feature**: The system lacks a DIL (Drug License) number field in settings and on printed invoices, which is required for pharmacy documentation.

## Requested Changes (Diff)

### Add
- DIL number field in backend `FirmSettings` type
- DIL number input in Settings page UI
- DIL number display on printed invoices

### Modify
- Fix cursor jumping issue in all input fields across:
  - InventoryPage: Medicine name, quantity, batch number, HSN code, expiry date, purchase rate, selling rate, MRP inputs
  - DoctorsPage: Doctor name and margin percentage inputs
  - BillingPage: Quantity input field
  - SettingsPage: All firm details input fields
- Update backend to store and retrieve DIL number as part of firm settings
- Update invoice printing layout to include DIL number field

### Remove
- None

## Implementation Plan

### Backend Changes
1. **Update `FirmSettings` type** in `main.mo`:
   - Add `dilNumber: Text` field to the `FirmSettings` record type
   - Update `updateFirmSettings` function to accept `dilNumber` parameter
   - Update `getFirmSettings` query to return default value for `dilNumber` when not set

### Frontend Changes
1. **Fix cursor jumping in InventoryPage**:
   - Review state update patterns in medicine form inputs
   - Ensure controlled input values use functional state updates (`prev => ({ ...prev, field: value })`)
   - Remove any unnecessary re-renders or key changes

2. **Fix cursor jumping in DoctorsPage**:
   - Apply same controlled input pattern fixes to doctor form fields
   - Ensure state updates don't cause unmounting/remounting of input components

3. **Fix cursor jumping in BillingPage**:
   - Fix quantity input field to maintain cursor position during typing
   - Review select dropdown interactions

4. **Fix cursor jumping in SettingsPage**:
   - Apply controlled input fixes to all firm settings fields
   - Ensure textarea components maintain cursor position

5. **Add DIL number to Settings**:
   - Add DIL number input field in the SettingsPage form
   - Include DIL number in the form state and submission
   - Add appropriate label and placeholder text
   - Position it logically near other regulatory fields (after GSTIN)

6. **Add DIL number to Invoices**:
   - Update invoice printing component to display DIL number
   - Position DIL number in the header section alongside other firm details
   - Fetch DIL number from firm settings when generating invoices

### Validation & Testing
1. Verify all input fields allow continuous typing without cursor jumps
2. Test DIL number appears correctly on printed invoices
3. Test DIL number persists after saving settings
4. Ensure backward compatibility with existing firm settings

## UX Notes

- **Cursor jumping fix**: Users should be able to type continuously in all input fields without any interruption or cursor repositioning. This is critical for data entry efficiency.
- **DIL number placement**: Should appear in Settings page near GSTIN field (after it) since both are regulatory identifiers
- **DIL number on invoice**: Should be displayed prominently in the header section of printed invoices, typically near the firm name and GSTIN
- **Form validation**: DIL number should be optional (not required) as not all pharmacies may have one immediately available
