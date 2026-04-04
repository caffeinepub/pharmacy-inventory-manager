# Pharmacy Inventory Manager – Credit Note Module

## Current State
- Full pharmacy billing app with invoices, ledger, inventory, doctor management
- Invoices stored in backend with fields: invoiceNumber, doctorName, items, subtotal, gstAmount, grandTotal, paymentType, amountPaid, amountDue, printed, timestamp
- InvoiceItem: medicineName, batchNumber, hsnCode, quantity, sellingPrice, amount, expiryDate, purchaseRate, profit
- Ledger tracks credit/cash invoices with payment history per doctor
- InvoicesPage shows list of invoices with View/Delete per row
- InvoicePreview component renders the invoice in A5 format with editable fields
- invoiceDownload utility handles JPEG/PDF export with oklch color fix
- FirmSettings stored in backend with name, address, gstin, dilNumber, contact
- Doctor has shippingAddress and customPrices

## Requested Changes (Diff)

### Add
- **CreditNote type** in backend: creditNoteNumber (auto-incremented, CN-000001 format), linkedInvoiceNumber, doctorName, timestamp, items (CreditNoteItem[]), subtotal, gstAmount, grandTotal, reason, status ("apply_to_balance" | "refund" | "carry_forward")
- **CreditNoteItem type**: medicineName, batchNumber, hsnCode, quantity, sellingPrice, amount, expiryDate — mirrors InvoiceItem but only credited items
- **Backend functions**: createCreditNote(linkedInvoiceNumber, items[(medicineName, qty)], reason, status), getAllCreditNotes(), getCreditNote(cnNumber), deleteCreditNote(cnNumber)
- When a credit note is created with status "apply_to_balance": reduce the linked invoice's amountDue by the credit note grandTotal (min 0)
- When status is "carry_forward": store credit as a balance on the doctor's account (doctorCreditBalance map)
- When status is "refund": record it as a refund entry (no balance change, just audit)
- **getDoctorCreditBalance(doctorName)** query
- **CreditNotePage** (new tab "Credit Notes" in App.tsx nav): lists all credit notes with columns: CN#, Invoice Ref, Doctor, Amount, Status, Action (View/Delete)
- **"Create Credit Note" button** inside InvoicesPage invoice view dialog — opens CreateCreditNoteDialog
- **CreateCreditNoteDialog**: 
  - Shows invoice reference and doctor name (pre-filled)
  - Line items from the original invoice with checkboxes to select items to credit
  - Each selected item has an editable quantity field (max = original invoice qty)
  - Reason field (text input, required)
  - Status selector: "Apply to Balance" | "Refund" | "Carry Forward"
  - GST auto-calculated at 5% of selected items subtotal (rounded to whole rupees)
  - Grand total shown
  - Submit creates credit note in backend and updates ledger accordingly
- **CreditNotePreview** component: mirrors InvoicePreview but labeled "CREDIT NOTE", shows CN number, "Against Invoice: INV-XXXXXX", negative amounts displayed, reason field shown
- Credit note download as JPEG and PDF (same invoiceDownload utility)
- **Audit log** in CreditNotePage: each credit note shows creation timestamp, linked invoice, doctor, items credited, reason, and accounting action taken

### Modify
- **InvoicesPage**: Add "Create Credit Note" button in the invoice dialog toolbar (alongside Print/JPEG/PDF buttons)
- **LedgerPage**: In DoctorDetailView, show credit note impact on balance — credit notes with "apply_to_balance" reduce the outstanding; show a "Credit Notes" section below invoices
- **App.tsx**: Add new "Credit Notes" tab with FileCheck icon
- **backend.d.ts** and **declarations/backend.did.d.ts**: Add CreditNote, CreditNoteItem types and new functions
- **useQueries.ts**: Add useCreateCreditNote, useGetAllCreditNotes, useGetCreditNote, useDeleteCreditNote, useGetDoctorCreditBalance hooks

### Remove
- Nothing removed

## Implementation Plan
1. Add CreditNote and CreditNoteItem types to Motoko backend; add stable maps creditNotes and doctorCreditBalances; add createCreditNote, getAllCreditNotes, getCreditNote, deleteCreditNote, getDoctorCreditBalance functions; update recordPayment logic to account for credit balance if status=carry_forward
2. Update backend.d.ts and declarations/backend.did.d.ts with new types and function signatures
3. Add useCreateCreditNote, useGetAllCreditNotes, useGetCreditNote, useDeleteCreditNote, useGetDoctorCreditBalance to useQueries.ts
4. Create CreditNotePreview component mirroring InvoicePreview layout but with CREDIT NOTE header, CN number, invoice reference, reason field, negative-style display
5. Create CreateCreditNoteDialog with item selection checkboxes, editable quantity per item, reason field, status dropdown, calculated totals
6. Create CreditNotesPage with list table (CN#, Invoice Ref, Doctor, Amount, Status, View/Delete actions) and audit log view
7. Add "Create Credit Note" button to InvoicesPage dialog toolbar
8. Add credit notes section to LedgerPage DoctorDetailView
9. Add Credit Notes tab to App.tsx navigation (grid-cols-8)
