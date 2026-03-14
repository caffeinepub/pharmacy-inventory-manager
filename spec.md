# Pharmacy Inventory Manager

## Current State
Doctors have `name`, `shippingAddress`, and `customPrices` fields. The invoice header always shows the firm's DIL No from Settings, regardless of which doctor is selected.

## Requested Changes (Diff)

### Add
- `dilNumber: Text` field to the `Doctor` type in backend
- Optional DIL No input field in the Add/Edit Doctor form in DoctorsPage
- Logic in `buildEditableInvoice` to use doctor's `dilNumber` (fallback to "N/A" if empty)

### Modify
- `addDoctor` and `updateDoctor` backend functions to accept `dilNumber` parameter
- `Doctor` type in `backend.d.ts` to include `dilNumber: string`
- `useAddDoctor` and `useUpdateDoctor` hooks to pass `dilNumber`
- `DoctorsPage.tsx` form to include DIL No field
- `InvoicePreview.tsx` `buildEditableInvoice` to use doctor's `dilNumber` instead of firm's

### Remove
- Nothing removed

## Implementation Plan
1. Update `Doctor` type in `main.mo` to add `dilNumber: Text`
2. Update `addDoctor`, `updateDoctor`, `getDoctor`, `getAllDoctors` backend functions
3. Update `backend.d.ts` Doctor interface and function signatures
4. Update `useAddDoctor` and `useUpdateDoctor` hooks to include dilNumber param
5. Update `DoctorsPage.tsx` form to add optional DIL No input
6. Update `buildEditableInvoice` in `InvoicePreview.tsx` to use `doctor?.dilNumber || "N/A"`
