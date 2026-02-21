# Pharmacy Inventory Manager

## Current State

The pharmacy inventory management system currently includes:

**Backend (Motoko)**:
- FirmSettings type with: name, address, gstin, contact, email
- updateFirmSettings and getFirmSettings functions

**Frontend**:
- SettingsPage.tsx: Form to edit firm name, business address, GSTIN, contact, and email
- InvoicesPage.tsx: Displays invoices with firm details in the header (name, address, gstin, contact, email)
- BillingPage.tsx: Creates bills with doctor selection and GST calculations, displays margin percentage in the bill items table

## Requested Changes (Diff)

### Add
- Shipping address field in FirmSettings (backend)
- Shipping address input field in SettingsPage (frontend)
- Shipping address display section in the invoice print layout (InvoicesPage)

### Modify
- Backend: FirmSettings type to include shippingAddress field
- Backend: updateFirmSettings function signature to include shippingAddress parameter
- Backend: getFirmSettings default return value to include shippingAddress
- Frontend SettingsPage: Add shipping address textarea input to the form
- Frontend InvoicesPage: Remove email display from invoice header, add shipping address section
- Frontend BillingPage: Remove Margin% column from the bill items table (both in the preview table and in calculations)

### Remove
- Email field display from invoice print layout in InvoicesPage
- Margin% column from bill items table in BillingPage

## Implementation Plan

1. **Backend Changes**:
   - Update FirmSettings type to add `shippingAddress: Text` field
   - Update updateFirmSettings function to accept shippingAddress parameter
   - Update getFirmSettings default return to include empty shippingAddress

2. **Settings Page Changes**:
   - Add shippingAddress field to SettingsFormData interface
   - Add shipping address Textarea input field after business address
   - Wire up state management for shipping address
   - Pass shippingAddress to updateFirmSettings mutation

3. **Billing Page Changes**:
   - Remove "Margin%" table header and column from the bill items table
   - Keep margin calculation in backend logic (for pricing), but don't display it in UI

4. **Invoice Page Changes**:
   - Remove email from firm details display in invoice header
   - Add shipping address section below firm details (if shipping address exists)
   - Keep email field in settings but don't show it on printed invoices

## UX Notes

- Shipping address will be optional (like other firm fields)
- In the invoice, shipping address will appear as a separate line/section if populated
- Margin percentage will still be applied to calculations but won't be visible to customers on bills
- Email remains editable in settings but won't clutter the invoice layout
