import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  FirmSettings,
  Invoice,
  InvoiceItem,
  Medicine,
} from "../backend.d";

// ---- Inline editable input ----
interface InlineEditProps {
  value: string | number;
  onChange: (v: string) => void;
  className?: string;
  type?: string;
  style?: React.CSSProperties;
  textAlign?: "left" | "right" | "center";
}

function InlineEdit({
  value,
  onChange,
  className = "",
  type = "text",
  style,
  textAlign = "left",
}: InlineEditProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-transparent border-0 outline-none p-0 m-0 w-full focus:border-b focus:border-gray-500 focus:shadow-none ${className}`}
      style={{
        color: "black",
        textAlign,
        fontFamily: "inherit",
        fontSize: "inherit",
        fontWeight: "inherit",
        lineHeight: "inherit",
        ...style,
      }}
    />
  );
}

// ---- Editable invoice state types ----
export interface EditableItem {
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  mrp: number | null;
  amount: number; // qty * rate
  gst: number; // overridable
  total: number; // amount + gst
}

export interface EditableInvoiceData {
  firmName: string;
  firmAddress: string;
  firmGstin: string;
  firmDilNumber: string;
  firmContact: string;
  shippingAddress: string;
  invoiceNumber: string;
  date: string;
  doctorName: string;
  items: EditableItem[];
  gstOverride: number | null; // if null, computed from items
}

export function buildEditableInvoice(
  invoice: Invoice,
  firmSettings: FirmSettings | undefined,
  medicines: Medicine[],
  doctors: { name: string; shippingAddress: string }[],
): EditableInvoiceData {
  const doctor = doctors.find((d) => d.name === invoice.doctorName);
  const shippingAddress =
    doctor?.shippingAddress || firmSettings?.defaultShippingAddress || "";

  const items: EditableItem[] = invoice.items.map((item: InvoiceItem) => {
    const qty = Number(item.quantity);
    const rate = Number(item.sellingPrice);
    const amount = Number.parseFloat((qty * rate).toFixed(2));
    const gst = Number.parseFloat(((amount * 5) / 100).toFixed(2));
    const medicine = medicines.find((m) => m.name === item.medicineName);
    const mrp = medicine ? Number(medicine.mrp) : null;
    return {
      medicineName: item.medicineName,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      hsnCode: item.hsnCode,
      quantity: qty,
      rate,
      mrp,
      amount,
      gst,
      total: Number.parseFloat((amount + gst).toFixed(2)),
    };
  });

  const totalGst = Number.parseFloat(
    ((items.reduce((s, i) => s + i.amount, 0) * 5) / 100).toFixed(2),
  );

  return {
    firmName: firmSettings?.name || "PharmaCare",
    firmAddress: firmSettings?.address || "",
    firmGstin: firmSettings?.gstin || "",
    firmDilNumber: firmSettings?.dilNumber || "",
    firmContact: firmSettings?.contact || "",
    shippingAddress,
    invoiceNumber: invoice.invoiceNumber.toString().padStart(6, "0"),
    date: new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    doctorName: invoice.doctorName,
    items,
    gstOverride: totalGst,
  };
}

// ---- Main InvoicePreview component ----
interface InvoicePreviewProps {
  invoice: Invoice;
  firmSettings: FirmSettings | undefined;
  medicines: Medicine[];
  doctors: { name: string; shippingAddress: string }[];
  onSave?: (data: EditableInvoiceData) => Promise<void>;
}

export default function InvoicePreview({
  invoice,
  firmSettings,
  medicines,
  doctors,
  onSave,
}: InvoicePreviewProps) {
  const [data, setData] = useState<EditableInvoiceData>(() =>
    buildEditableInvoice(invoice, firmSettings, medicines, doctors),
  );
  const [isSaving, setIsSaving] = useState(false);

  // Reset when invoice changes
  useEffect(() => {
    setData(buildEditableInvoice(invoice, firmSettings, medicines, doctors));
  }, [invoice, firmSettings, medicines, doctors]);

  // Computed totals
  const subtotal = data.items.reduce((s, item) => s + item.amount, 0);
  const computedGst = data.items.reduce((s, item) => s + item.gst, 0);
  const activeGst = data.gstOverride !== null ? data.gstOverride : computedGst;
  const grandTotal = subtotal + activeGst;

  // Update a top-level field
  const setField = (field: keyof EditableInvoiceData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // Update an item field with recalculation
  const updateItem = (
    index: number,
    field: keyof EditableItem,
    rawValue: string,
  ) => {
    setData((prev) => {
      const items = [...prev.items];
      const item = { ...items[index] };

      if (
        field === "medicineName" ||
        field === "batchNumber" ||
        field === "expiryDate" ||
        field === "hsnCode"
      ) {
        (item as Record<string, unknown>)[field] = rawValue;
      } else if (field === "quantity") {
        const qty = Number.parseFloat(rawValue) || 0;
        item.quantity = qty;
        const amount = Number.parseFloat((qty * item.rate).toFixed(2));
        item.amount = amount;
        const gst = Number.parseFloat(((amount * 5) / 100).toFixed(2));
        item.gst = gst;
        item.total = Number.parseFloat((amount + gst).toFixed(2));
      } else if (field === "rate") {
        const rate = Number.parseFloat(rawValue) || 0;
        item.rate = rate;
        const amount = Number.parseFloat((item.quantity * rate).toFixed(2));
        item.amount = amount;
        const gst = Number.parseFloat(((amount * 5) / 100).toFixed(2));
        item.gst = gst;
        item.total = Number.parseFloat((amount + gst).toFixed(2));
      } else if (field === "mrp") {
        item.mrp = Number.parseFloat(rawValue) || 0;
      } else if (field === "gst") {
        const gst = Number.parseFloat(rawValue) || 0;
        item.gst = gst;
        item.total = Number.parseFloat((item.amount + gst).toFixed(2));
      } else if (field === "amount") {
        const amount = Number.parseFloat(rawValue) || 0;
        item.amount = amount;
        const gst = Number.parseFloat(((amount * 5) / 100).toFixed(2));
        item.gst = gst;
        item.total = Number.parseFloat((amount + gst).toFixed(2));
      }

      items[index] = item;
      return { ...prev, items };
    });
  };

  const cellStyle: React.CSSProperties = {
    color: "black",
    borderColor: "black",
    padding: "4px 6px",
    border: "1px solid black",
  };

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    backgroundColor: "#e5e7eb",
    fontWeight: 600,
  };

  return (
    <div className="invoice-print-container">
      <style>
        {`
          /* Ensure invoice container inputs never clip text */
          .invoice-print-container input,
          .invoice-print-container textarea {
            box-sizing: border-box !important;
            overflow: visible !important;
            white-space: nowrap !important;
            line-height: 1.5 !important;
          }
          /* Inline edit hover hint */
          .invoice-editable-cell input:hover {
            background-color: rgba(0,0,0,0.03) !important;
          }
          .invoice-editable-cell input:focus {
            border-bottom: 1.5px solid #374151 !important;
            background-color: rgba(0,0,0,0.04) !important;
          }
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }
            [role="dialog"] {
              position: static !important;
              width: 100% !important;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              border: none !important;
              box-shadow: none !important;
              background: white !important;
              transform: none !important;
              animation: none !important;
            }
            [role="dialog"] > * {
              display: none !important;
            }
            .invoice-print-container {
              display: block !important;
              width: 210mm !important;
              min-height: 297mm !important;
              padding: 15mm !important;
              box-sizing: border-box !important;
              background: white !important;
              color: black !important;
              margin: 0 auto !important;
            }
            .invoice-print-container * {
              display: revert !important;
            }
            @page {
              size: A4 portrait;
              margin: 0;
            }
            .invoice-print-container h1 {
              font-size: 22px !important;
            }
            .invoice-print-container p,
            .invoice-print-container td,
            .invoice-print-container th {
              font-size: 10px !important;
            }
            .invoice-print-container table {
              font-size: 9px !important;
              width: 100% !important;
            }
            .invoice-print-container .text-3xl {
              font-size: 18px !important;
            }
            .invoice-print-container table td,
            .invoice-print-container table th {
              padding: 1.5mm !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            input {
              border-bottom: none !important;
            }
          }
        `}
      </style>

      {/* invoice-container is the exact element captured for JPEG download */}
      <div
        className="invoice-container bg-white text-black p-8 space-y-6"
        style={{ boxSizing: "border-box", background: "white", color: "black" }}
      >
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4">
          <h1 className="text-3xl font-bold mb-2 invoice-editable-cell">
            <InlineEdit
              value={data.firmName}
              onChange={(v) => setField("firmName", v)}
              className="text-center text-3xl font-bold"
              style={{ textAlign: "center" }}
              textAlign="center"
            />
          </h1>
          <p className="text-sm invoice-editable-cell">
            <InlineEdit
              value={data.firmAddress}
              onChange={(v) => setField("firmAddress", v)}
              className="text-sm text-center"
              textAlign="center"
            />
          </p>
          <div className="flex justify-center gap-6 mt-2 text-sm flex-wrap">
            <p className="flex items-center gap-1">
              <strong>GSTIN:</strong>
              <span className="invoice-editable-cell inline-block min-w-[80px]">
                <InlineEdit
                  value={data.firmGstin}
                  onChange={(v) => setField("firmGstin", v)}
                  className="text-sm"
                />
              </span>
            </p>
            <p className="flex items-center gap-1">
              <strong>DIL No:</strong>
              <span className="invoice-editable-cell inline-block min-w-[60px]">
                <InlineEdit
                  value={data.firmDilNumber}
                  onChange={(v) => setField("firmDilNumber", v)}
                  className="text-sm"
                />
              </span>
            </p>
            <p className="flex items-center gap-1">
              <strong>Contact:</strong>
              <span className="invoice-editable-cell inline-block min-w-[80px]">
                <InlineEdit
                  value={data.firmContact}
                  onChange={(v) => setField("firmContact", v)}
                  className="text-sm"
                />
              </span>
            </p>
          </div>
          {(data.shippingAddress || true) && (
            <div className="text-sm mt-2">
              <strong>Shipping Address:</strong>
              <div className="invoice-editable-cell max-w-2xl mx-auto mt-1">
                <textarea
                  value={data.shippingAddress}
                  onChange={(e) => setField("shippingAddress", e.target.value)}
                  rows={2}
                  className="bg-transparent border-0 outline-none p-0 m-0 w-full text-center text-sm focus:border-b focus:border-gray-500 resize-none"
                  style={{
                    color: "black",
                    fontFamily: "inherit",
                    fontSize: "inherit",
                    lineHeight: "1.5",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Invoice Info */}
        <div className="flex justify-between text-sm">
          <div>
            <p className="mb-1 flex items-center gap-1">
              <strong>Invoice Number:</strong>
              <span className="invoice-editable-cell inline-block min-w-[80px]">
                <InlineEdit
                  value={data.invoiceNumber}
                  onChange={(v) => setField("invoiceNumber", v)}
                  className="text-sm"
                />
              </span>
            </p>
            <p className="flex items-center gap-1">
              <strong>Date:</strong>
              <span className="invoice-editable-cell inline-block min-w-[120px]">
                <InlineEdit
                  value={data.date}
                  onChange={(v) => setField("date", v)}
                  className="text-sm"
                />
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1">
              <strong>Doctor:</strong>
              <span className="invoice-editable-cell inline-block min-w-[100px]">
                <InlineEdit
                  value={data.doctorName}
                  onChange={(v) => setField("doctorName", v)}
                  className="text-sm"
                  textAlign="right"
                />
              </span>
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div style={{ border: "1px solid black" }}>
          <table
            className="w-full text-sm"
            style={{ borderCollapse: "collapse" }}
          >
            <thead>
              <tr>
                <th style={headerCellStyle}>S.No</th>
                <th style={headerCellStyle}>Medicine Name</th>
                <th style={headerCellStyle}>Batch</th>
                <th style={headerCellStyle}>Expiry</th>
                <th style={headerCellStyle}>HSN Code</th>
                <th style={{ ...headerCellStyle, textAlign: "right" }}>Qty</th>
                <th style={{ ...headerCellStyle, textAlign: "right" }}>Rate</th>
                <th style={{ ...headerCellStyle, textAlign: "right" }}>MRP</th>
                <th style={{ ...headerCellStyle, textAlign: "right" }}>
                  Amount
                </th>
                <th style={{ ...headerCellStyle, textAlign: "right" }}>
                  GST 5%
                </th>
                <th style={{ ...headerCellStyle, textAlign: "right" }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: invoice items don't have stable IDs
                <tr key={`inv-edit-item-${index}`}>
                  <td style={cellStyle}>{index + 1}</td>
                  <td style={cellStyle} className="invoice-editable-cell">
                    <InlineEdit
                      value={item.medicineName}
                      onChange={(v) => updateItem(index, "medicineName", v)}
                    />
                  </td>
                  <td style={cellStyle} className="invoice-editable-cell">
                    <InlineEdit
                      value={item.batchNumber}
                      onChange={(v) => updateItem(index, "batchNumber", v)}
                    />
                  </td>
                  <td style={cellStyle} className="invoice-editable-cell">
                    <InlineEdit
                      value={item.expiryDate}
                      onChange={(v) => updateItem(index, "expiryDate", v)}
                    />
                  </td>
                  <td style={cellStyle} className="invoice-editable-cell">
                    <InlineEdit
                      value={item.hsnCode}
                      onChange={(v) => updateItem(index, "hsnCode", v)}
                    />
                  </td>
                  <td
                    style={{ ...cellStyle, textAlign: "right" }}
                    className="invoice-editable-cell"
                  >
                    <InlineEdit
                      value={item.quantity}
                      onChange={(v) => updateItem(index, "quantity", v)}
                      type="number"
                      textAlign="right"
                    />
                  </td>
                  <td
                    style={{ ...cellStyle, textAlign: "right" }}
                    className="invoice-editable-cell"
                  >
                    <InlineEdit
                      value={item.rate}
                      onChange={(v) => updateItem(index, "rate", v)}
                      type="number"
                      textAlign="right"
                    />
                  </td>
                  <td
                    style={{ ...cellStyle, textAlign: "right" }}
                    className="invoice-editable-cell"
                  >
                    <InlineEdit
                      value={item.mrp !== null ? item.mrp : ""}
                      onChange={(v) => updateItem(index, "mrp", v)}
                      type="number"
                      textAlign="right"
                    />
                  </td>
                  <td
                    style={{ ...cellStyle, textAlign: "right" }}
                    className="invoice-editable-cell"
                  >
                    <InlineEdit
                      value={item.amount}
                      onChange={(v) => updateItem(index, "amount", v)}
                      type="number"
                      textAlign="right"
                    />
                  </td>
                  <td
                    style={{ ...cellStyle, textAlign: "right" }}
                    className="invoice-editable-cell"
                  >
                    <InlineEdit
                      value={item.gst}
                      onChange={(v) => updateItem(index, "gst", v)}
                      type="number"
                      textAlign="right"
                    />
                  </td>
                  <td
                    style={{
                      ...cellStyle,
                      textAlign: "right",
                      fontWeight: 600,
                    }}
                  >
                    ₹{item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: "#f3f4f6" }}>
                <td
                  colSpan={8}
                  style={{ ...cellStyle, textAlign: "right", fontWeight: 600 }}
                >
                  Subtotal:
                </td>
                <td
                  style={{ ...cellStyle, textAlign: "right", fontWeight: 600 }}
                >
                  ₹{subtotal.toFixed(2)}
                </td>
                <td
                  style={{ ...cellStyle, textAlign: "right", fontWeight: 600 }}
                  className="invoice-editable-cell"
                >
                  <InlineEdit
                    value={activeGst}
                    onChange={(v) =>
                      setData((prev) => ({
                        ...prev,
                        gstOverride: Number.parseFloat(v) || 0,
                      }))
                    }
                    type="number"
                    textAlign="right"
                  />
                </td>
                <td
                  style={{
                    ...cellStyle,
                    textAlign: "right",
                    fontSize: "1.1em",
                    fontWeight: 700,
                  }}
                >
                  ₹{grandTotal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Summary */}
        <div
          className="p-4 border-2 border-black"
          style={{ backgroundColor: "#f3f4f6" }}
        >
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-sm">
                <strong>Subtotal:</strong> ₹{subtotal.toFixed(2)}
              </p>
              <p className="text-sm flex items-center gap-1">
                <strong>GST (5%):</strong>
                <span className="invoice-editable-cell inline-block min-w-[60px]">
                  <InlineEdit
                    value={activeGst}
                    onChange={(v) =>
                      setData((prev) => ({
                        ...prev,
                        gstOverride: Number.parseFloat(v) || 0,
                      }))
                    }
                    type="number"
                    className="text-sm"
                  />
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold" style={{ color: "black" }}>
                Grand Total
              </p>
              <p className="text-3xl font-bold" style={{ color: "black" }}>
                ₹{grandTotal.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Save Changes button — hidden when printing */}
        {onSave && (
          <div className="print:hidden flex justify-end pt-2">
            <button
              type="button"
              onClick={async () => {
                setIsSaving(true);
                try {
                  await onSave(data);
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 20px",
                backgroundColor: isSaving ? "#6b7280" : "#16a34a",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: isSaving ? "not-allowed" : "pointer",
                transition: "background-color 0.2s",
              }}
            >
              <Save size={16} />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

        {/* Footer */}
        <div
          className="text-center text-xs pt-4 border-t border-black"
          style={{ color: "black" }}
        >
          <p>Thank you for your business!</p>
          <p className="mt-1">
            This is a computer-generated invoice and does not require a
            signature.
          </p>
        </div>
      </div>
    </div>
  );
}
