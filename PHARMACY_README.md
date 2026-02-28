# PharmaCare ERP - Pharmacy Inventory Management System

A complete pharmacy inventory and billing management system built on the Internet Computer with React 19 + TypeScript frontend.

## Features

### 📊 Dashboard
- **Real-time Overview**: Total inventory value, medicine count, and doctor statistics
- **Expiry Alerts**: Color-coded warnings for expired and expiring medicines (3-month threshold)
- **Recent Invoices**: Quick access to the last 5 generated invoices
- **Visual KPIs**: Professional card-based metrics with icons and color coding

### 💊 Inventory Management
- **Complete CRUD Operations**: Add, edit, update, and delete medicines
- **Comprehensive Tracking**: 
  - Medicine name, quantity (units), batch number, HSN code
  - Expiry date with visual warnings
  - Purchase rate, selling rate, and MRP
  - Automatic stock value calculation (quantity × purchase rate)
- **Smart Filtering**: Real-time search by medicine name
- **Expiry Indicators**: 
  - Red text for expired medicines
  - Yellow text for medicines expiring within 3 months
  - Alert icons for visual emphasis
- **Validation**: Required fields, positive numbers, date validation

### 👨‍⚕️ Doctor Management
- **Doctor Registry**: Maintain a list of prescribing doctors
- **Custom Margins**: Assign individual margin percentages (0-100%) per doctor
- **Simple Interface**: Add, edit, and remove doctors with ease
- **Margin Application**: Doctor margins automatically applied during billing

### 🧾 Billing & Invoice Generation
- **Medicine Selection**: Searchable dropdown with stock and rate information
- **Quantity Management**: Real-time stock validation
- **Doctor Selection**: Apply doctor-specific margin percentages to entire bill
- **Line Item Details**:
  - Medicine name, batch, HSN code
  - Quantity, rate, margin percentage
  - Amount calculation with margin
  - SGST (2.5%) and CGST (2.5%) breakdown
  - Total per item
- **Bill Summary Panel**:
  - Item count
  - Subtotal
  - Total SGST and CGST
  - Grand total
- **Cart Management**: Add/remove items, clear all functionality
- **Automatic GST Calculation**: 5% GST split into SGST and CGST

### 📄 Invoice History
- **Complete Invoice List**: All generated invoices with key details
- **Invoice Viewing**: Professional A4 portrait layout for each invoice
- **Print Functionality**: Browser print with optimized @media print CSS
- **Invoice Layout**:
  - **Header**: Firm name, address, GSTIN, contact, email
  - **Info Section**: Invoice number, date, doctor name
  - **Detailed Table**: All line items with complete breakdown
  - **Summary**: Subtotal, SGST, CGST, and grand total
  - **Footer**: Professional closing message
- **Print-Optimized**: 210mm A4 width with proper margins

### ⚙️ Firm Settings
- **Business Information**:
  - Firm name (required)
  - Business address
  - GSTIN (15-character validation)
  - Contact number
  - Email address
- **Invoice Integration**: Settings appear on all generated invoices
- **Form Validation**: Required fields and format validation
- **Reset Functionality**: Revert to saved settings

## Design & UX

### Visual Direction
- **Healthcare Theme**: Clinical teal primary color with warm neutrals
- **Professional Aesthetic**: Clean, modern ERP-style interface
- **Typography**: 
  - Inter for body text (clean, professional)
  - Poppins for headings (distinctive, bold)
  - JetBrains Mono for codes (batch numbers, HSN codes, invoice numbers)
- **Color System**: OKLCH-based design tokens for perceptual uniformity
- **Light/Dark Mode**: Full theme support with carefully tuned contrast ratios

### User Experience
- **Tab Navigation**: Quick switching between sections without page reload
- **Loading States**: Skeleton loaders for smooth data fetching experience
- **Toast Notifications**: Success/error feedback for all operations
- **Responsive Design**: Optimized for desktop (mobile-friendly)
- **Empty States**: Helpful messages and CTAs when no data exists
- **Confirmation Dialogs**: Alert dialogs for destructive operations
- **Form Validation**: Real-time validation with clear error messages
- **Keyboard Accessible**: Full keyboard navigation support

## Technical Stack

### Frontend
- **React 19**: Latest React with modern hooks
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **shadcn/ui**: High-quality component library (Radix primitives)
- **TanStack Query**: Server state management with caching
- **Sonner**: Toast notifications
- **Lucide React**: Icon system

### Backend Integration
- **Internet Computer**: Motoko backend canister
- **Actor Pattern**: React Query hooks wrapping backend calls
- **BigInt Handling**: Proper conversion between frontend (Number) and backend (BigInt)
- **Error Handling**: User-friendly error messages with proper error propagation

## Key Implementation Details

### Data Flow
1. **Query Hooks**: Custom hooks in `useQueries.ts` for all backend operations
2. **Automatic Refetching**: Mutations invalidate relevant queries for UI consistency
3. **Optimistic Updates**: Immediate UI feedback with server synchronization
4. **Error Recovery**: Graceful error handling with user notifications

### GST Calculation
```typescript
// Base amount with doctor margin
const baseAmount = rate × quantity
const marginAmount = (baseAmount × marginPercentage) / 100
const amount = baseAmount + marginAmount

// GST breakdown
const sgst = (amount × 2.5) / 100  // 2.5% SGST
const cgst = (amount × 2.5) / 100  // 2.5% CGST
const totalAmount = amount + sgst + cgst
```

### Expiry Logic
- **Expired**: `expiryDate < today`
- **Expiring Soon**: `today <= expiryDate <= today + 3 months`
- **Visual Indicators**: Color coding (red/yellow) + alert icons

### Invoice Printing
- Custom CSS in dialog for print-specific styling
- A4 portrait dimensions (210mm width)
- Print-only visibility rules
- Professional table borders and spacing

## File Structure

```
src/frontend/src/
├── App.tsx                      # Main app with tab navigation
├── pages/
│   ├── DashboardPage.tsx        # Dashboard with KPIs and alerts
│   ├── InventoryPage.tsx        # Medicine CRUD operations
│   ├── DoctorsPage.tsx          # Doctor management
│   ├── BillingPage.tsx          # Cart and invoice creation
│   ├── InvoicesPage.tsx         # Invoice history and printing
│   └── SettingsPage.tsx         # Firm settings
├── hooks/
│   └── useQueries.ts            # React Query hooks for backend
├── components/ui/               # shadcn/ui components (read-only)
├── backend.d.ts                 # Backend type definitions
└── backend.ts                   # Backend actor wrapper

src/frontend/
├── index.css                    # Design tokens (OKLCH colors)
├── tailwind.config.js           # Tailwind customization
└── index.html                   # HTML entry with Google Fonts
```

## Usage Guide

### Initial Setup
1. Navigate to **Settings** tab
2. Enter your firm details (name, address, GSTIN, contact, email)
3. Click "Save Settings"

### Adding Inventory
1. Go to **Inventory** tab
2. Click "Add Medicine" button
3. Fill in all required fields:
   - Medicine name
   - Quantity (units in stock)
   - Batch number
   - HSN code
   - Expiry date
   - Purchase rate, selling rate, MRP
4. Click "Add Medicine"

### Registering Doctors
1. Go to **Doctors** tab
2. Click "Add Doctor" button
3. Enter doctor name and margin percentage (0-100%)
4. Click "Add Doctor"

### Creating an Invoice
1. Go to **Billing** tab
2. Select a medicine from dropdown
3. Enter quantity (validates against available stock)
4. Click "Add" to add to cart
5. Repeat for all items
6. Select a doctor (applies their margin to all items)
7. Review the bill summary
8. Click "Create Invoice"
9. Invoice is generated and stock is automatically updated

### Viewing and Printing Invoices
1. Go to **Invoices** tab
2. Click "View" on any invoice
3. Review the complete invoice in A4 format
4. Click "Print" to open browser print dialog
5. Print or save as PDF

## Validation Rules

### Inventory
- All fields required
- Quantity, rates, and MRP must be positive numbers
- Valid expiry date required

### Doctors
- Name required
- Margin percentage must be 0-100

### Billing
- Medicine must be selected
- Quantity must be positive and <= available stock
- Doctor must be selected before creating invoice

### Settings
- Firm name required
- GSTIN must be 15 characters if provided
- Email must be valid format

## Color Coding

- **Primary (Teal)**: Actions, CTAs, active states
- **Destructive (Red)**: Delete actions, expired items
- **Warning (Yellow)**: Expiring items (within 3 months)
- **Success (Green)**: Successful operations
- **Muted**: Secondary information, placeholders

## Performance Optimizations

- **Query Caching**: 30-second stale time for queries
- **Parallel Queries**: Multiple independent queries run in parallel
- **Lazy Loading**: Dialog content only rendered when open
- **Efficient Re-renders**: React Query prevents unnecessary re-fetches
- **BigInt Conversion**: Minimal conversions between Number/BigInt

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- Focus visible indicators
- ARIA labels on interactive elements
- Color contrast > 4.5:1 for body text
- Screen reader friendly error messages

## Future Enhancements

Potential features for future iterations:
- Multi-page invoice support for large orders
- Batch operations (bulk import/export)
- Advanced reporting and analytics
- Inventory alerts (low stock warnings)
- Customer management
- Payment tracking
- Barcode scanning
- Invoice email delivery
- Multi-currency support
- Tax configuration by region

## Development

### Type Checking
```bash
pnpm --filter '@caffeine/template-frontend' typescript-check
```

### Linting
```bash
pnpm --filter '@caffeine/template-frontend' lint
```

### Build
```bash
pnpm --filter '@caffeine/template-frontend' build:skip-bindings
```

### Dev Server
```bash
cd src/frontend && pnpm dev
```

---

Built with ❤️ using [caffeine.ai](https://caffeine.ai)
