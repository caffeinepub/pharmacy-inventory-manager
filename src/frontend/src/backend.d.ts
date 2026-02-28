import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface BackupRecord {
    version: string;
    timestamp: bigint;
    invoices: Array<Invoice>;
    medicines: Array<Medicine>;
    firmSettings?: FirmSettings;
    doctors: Array<Doctor>;
    paymentRecords: Array<[bigint, Array<PaymentRecord>]>;
}
export interface InvoiceItem {
    purchaseRate: bigint;
    expiryDate: string;
    sellingPrice: bigint;
    hsnCode: string;
    batchNumber: string;
    quantity: bigint;
    profit: bigint;
    amount: bigint;
    medicineName: string;
}
export interface FirmSettings {
    contact: string;
    dilNumber: string;
    name: string;
    email: string;
    gstin: string;
    address: string;
    defaultShippingAddress: string;
}
export interface PaymentRecord {
    invoiceNumber: bigint;
    timestamp: bigint;
    paymentDate: string;
    amount: bigint;
}
export interface ProfitLossStats {
    invoiceCount: bigint;
    totalCost: bigint;
    totalRevenue: bigint;
    profitMargin: bigint;
    netProfit: bigint;
}
export interface Medicine {
    mrp: bigint;
    purchaseRate: bigint;
    expiryDate: string;
    name: string;
    hsnCode: string;
    baseSellingRate: bigint;
    batchNumber: string;
    quantity: bigint;
    sampling: bigint;
    openingStock: bigint;
}
export interface Invoice {
    gstAmount: bigint;
    amountPaid: bigint;
    grandTotal: bigint;
    totalProfit: bigint;
    invoiceNumber: bigint;
    timestamp: bigint;
    paymentType: string;
    amountDue: bigint;
    items: Array<InvoiceItem>;
    doctorName: string;
    subtotal: bigint;
}
export interface Doctor {
    name: string;
    customPrices: Array<[string, bigint]>;
    shippingAddress: string;
}
export interface LedgerSummary {
    totalCredit: bigint;
    totalPaid: bigint;
    outstandingBalance: bigint;
    doctorName: string;
}
export enum ProfitLossTimeFilter {
    all = "all",
    monthly = "monthly",
    daily = "daily",
    weekly = "weekly"
}
export interface backendInterface {
    addDoctor(name: string, shippingAddress: string): Promise<void>;
    addOrUpdateMedicine(name: string, openingStock: bigint, sampling: bigint, batchNumber: string, hsnCode: string, expiryDate: string, purchaseRate: bigint, baseSellingRate: bigint, mrp: bigint): Promise<void>;
    backup(): Promise<BackupRecord>;
    createInvoice(doctorName: string, items: Array<[string, bigint]>, paymentType: string): Promise<bigint>;
    deleteDoctor(name: string): Promise<void>;
    deleteInvoice(invoiceNumber: bigint): Promise<void>;
    deleteMedicine(name: string): Promise<void>;
    getAllDoctorPrices(doctorName: string): Promise<Array<[string, bigint]>>;
    getAllDoctors(): Promise<Array<Doctor>>;
    getAllInvoices(): Promise<Array<Invoice>>;
    getAllMedicines(): Promise<Array<Medicine>>;
    getAppPin(): Promise<string | null>;
    getDoctor(name: string): Promise<Doctor | null>;
    getDoctorLedgerSummary(doctorName: string): Promise<LedgerSummary>;
    getDoctorMedicinePrice(doctorName: string, medicineName: string): Promise<bigint>;
    getFirmSettings(): Promise<FirmSettings>;
    getInvoice(invoiceNumber: bigint): Promise<Invoice | null>;
    getInvoicePayments(invoiceNumber: bigint): Promise<Array<PaymentRecord>>;
    getMedicine(name: string): Promise<Medicine | null>;
    getProfitLossStats(filter: ProfitLossTimeFilter): Promise<ProfitLossStats>;
    getTotalBilledQuantity(name: string): Promise<bigint>;
    recordPayment(invoiceNumber: bigint, amount: bigint, paymentDate: string): Promise<void>;
    reduceMedicineStock(name: string, quantity: bigint): Promise<void>;
    removeDoctorMedicinePrice(doctorName: string, medicineName: string): Promise<void>;
    setAppPin(pin: string): Promise<void>;
    setDoctorMedicinePrice(doctorName: string, medicineName: string, price: bigint): Promise<void>;
    updateDoctor(name: string, shippingAddress: string): Promise<void>;
    updateFirmSettings(name: string, address: string, gstin: string, contact: string, email: string, defaultShippingAddress: string, dilNumber: string): Promise<void>;
    updateOpeningStock(name: string, openingStock: bigint): Promise<void>;
    updateSampling(name: string, sampling: bigint): Promise<void>;
}
