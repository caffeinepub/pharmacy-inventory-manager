import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Medicine {
    mrp: bigint;
    purchaseRate: bigint;
    expiryDate: string;
    name: string;
    hsnCode: string;
    sellingRate: bigint;
    batchNumber: string;
    quantity: bigint;
}
export interface InvoiceItem {
    marginPercentage: bigint;
    expiryDate: string;
    cgst: bigint;
    rate: bigint;
    sgst: bigint;
    hsnCode: string;
    totalAmount: bigint;
    batchNumber: string;
    quantity: bigint;
    amount: bigint;
    medicineName: string;
}
export interface FirmSettings {
    contact: string;
    name: string;
    email: string;
    gstin: string;
    address: string;
    shippingAddress: string;
}
export interface Invoice {
    totalCgst: bigint;
    totalSgst: bigint;
    grandTotal: bigint;
    invoiceNumber: bigint;
    totalAmount: bigint;
    items: Array<InvoiceItem>;
    doctorName: string;
}
export interface Doctor {
    marginPercentage: bigint;
    name: string;
}
export interface backendInterface {
    addOrUpdateDoctor(name: string, marginPercentage: bigint): Promise<void>;
    addOrUpdateMedicine(name: string, quantity: bigint, batchNumber: string, hsnCode: string, expiryDate: string, purchaseRate: bigint, sellingRate: bigint, mrp: bigint): Promise<void>;
    createInvoice(doctorName: string, items: Array<[string, bigint]>): Promise<bigint>;
    deleteDoctor(name: string): Promise<void>;
    deleteInvoice(invoiceNumber: bigint): Promise<void>;
    deleteMedicine(name: string): Promise<void>;
    getAllDoctors(): Promise<Array<Doctor>>;
    getAllInvoices(): Promise<Array<Invoice>>;
    getAllMedicines(): Promise<Array<Medicine>>;
    getDoctor(name: string): Promise<Doctor>;
    getFirmSettings(): Promise<FirmSettings>;
    getInvoice(invoiceNumber: bigint): Promise<Invoice | null>;
    getMedicine(name: string): Promise<Medicine | null>;
    updateFirmSettings(name: string, address: string, gstin: string, contact: string, email: string, shippingAddress: string): Promise<void>;
}
