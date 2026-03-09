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
  multiline?: boolean;
}

function InlineEdit({
  value,
  onChange,
  className = "",
  type = "text",
  style,
  textAlign = "left",
  multiline = false,
}: InlineEditProps) {
  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className={`bg-transparent border-0 outline-none p-0 m-0 w-full focus:border-b focus:border-gray-500 resize-none ${className}`}
        style={{
          color: "black",
          textAlign,
          fontFamily: "inherit",
          fontSize: "inherit",
          fontWeight: "inherit",
          lineHeight: "1.4",
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          overflow: "visible",
          padding: 0,
          margin: 0,
          width: "100%",
          boxSizing: "border-box",
          ...style,
        }}
      />
    );
  }
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
        boxSizing: "border-box",
        overflow: "visible",
        padding: 0,
        margin: 0,
        width: "100%",
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

  // Half A4 = A5 portrait: 148mm wide x 210mm tall
  // We render at a fixed pixel width (559px ≈ 148mm at 96dpi) so
  // the download capture matches the preview exactly.
  const INVOICE_WIDTH_PX = 560;

  // All cell styles use explicit hex colors (no oklch/Tailwind) for html2canvas compat
  const cellStyle: React.CSSProperties = {
    color: "black",
    borderColor: "black",
    padding: "3px 4px",
    border: "1px solid black",
    verticalAlign: "middle",
    wordBreak: "break-word",
    whiteSpace: "normal",
    overflow: "visible",
    textAlign: "center",
    boxSizing: "border-box",
  };

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    backgroundColor: "#e5e7eb",
    fontWeight: 600,
    whiteSpace: "nowrap",
    verticalAlign: "middle",
    textAlign: "center",
    fontSize: "8px",
    padding: "4px 3px",
  };

  return (
    <div className="invoice-print-container">
      <style>
        {`
          /* Prevent inputs from clipping text */
          .invoice-print-container input,
          .invoice-print-container textarea {
            box-sizing: border-box !important;
            overflow: visible !important;
            line-height: 1.4 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Ensure table cells allow text to wrap */
          .invoice-print-container td,
          .invoice-print-container th {
            word-break: break-word !important;
            white-space: normal !important;
            overflow: visible !important;
          }
          /* Medicine name column specifically allows 2-line wrap */
          .invoice-medicine-name-cell {
            min-width: 80px;
            max-width: 110px;
          }
          /* Narrow columns keep content visible */
          .invoice-narrow-cell {
            min-width: 40px;
          }
          /* Inline edit hover hint */
          .invoice-editable-cell input:hover,
          .invoice-editable-cell textarea:hover {
            background-color: rgba(0,0,0,0.03) !important;
          }
          .invoice-editable-cell input:focus,
          .invoice-editable-cell textarea:focus {
            border-bottom: 1.5px solid #374151 !important;
            background-color: rgba(0,0,0,0.04) !important;
          }
          /* Rupee prefix alignment */
          .rupee-cell {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1px;
            width: 100%;
          }
          .rupee-prefix {
            color: black;
            font-family: inherit;
            font-size: inherit;
            line-height: inherit;
            flex-shrink: 0;
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
              width: 148mm !important;
              padding: 8mm !important;
              box-sizing: border-box !important;
              background: white !important;
              color: black !important;
              margin: 0 auto !important;
            }
            .invoice-print-container * {
              display: revert !important;
            }
            @page {
              size: A5 portrait;
              margin: 0;
            }
            .invoice-print-container h1 {
              font-size: 16px !important;
            }
            .invoice-print-container p,
            .invoice-print-container td,
            .invoice-print-container th {
              font-size: 8px !important;
            }
            .invoice-print-container table {
              font-size: 7px !important;
              width: 100% !important;
            }
            .invoice-print-container .text-3xl {
              font-size: 16px !important;
            }
            .invoice-print-container table td,
            .invoice-print-container table th {
              padding: 1mm 1.5mm !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            input, textarea {
              border-bottom: none !important;
            }
          }
        `}
      </style>

      {/* invoice-container is captured for JPEG download — fixed pixel width = half A4 */}
      <div
        className="invoice-container"
        style={{
          width: `${INVOICE_WIDTH_PX}px`,
          boxSizing: "border-box",
          background: "white",
          color: "black",
          padding: "20px 24px",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: "11px",
          lineHeight: "1.4",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            borderBottom: "2px solid black",
            paddingBottom: "10px",
            marginBottom: "10px",
          }}
        >
          <div
            className="invoice-editable-cell"
            style={{ marginBottom: "4px" }}
          >
            <InlineEdit
              value={data.firmName}
              onChange={(v) => setField("firmName", v)}
              style={{
                textAlign: "center",
                fontSize: "18px",
                fontWeight: "bold",
                color: "black",
              }}
              textAlign="center"
            />
          </div>
          <div
            className="invoice-editable-cell"
            style={{ marginBottom: "4px" }}
          >
            <InlineEdit
              value={data.firmAddress}
              onChange={(v) => setField("firmAddress", v)}
              style={{ textAlign: "center", fontSize: "10px" }}
              textAlign="center"
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
              fontSize: "10px",
              marginBottom: "4px",
            }}
          >
            <span>
              <strong>GSTIN:</strong>{" "}
              <span
                className="invoice-editable-cell"
                style={{ display: "inline-block", minWidth: "80px" }}
              >
                <InlineEdit
                  value={data.firmGstin}
                  onChange={(v) => setField("firmGstin", v)}
                />
              </span>
            </span>
            <span>
              <strong>DIL No:</strong>{" "}
              <span
                className="invoice-editable-cell"
                style={{ display: "inline-block", minWidth: "60px" }}
              >
                <InlineEdit
                  value={data.firmDilNumber}
                  onChange={(v) => setField("firmDilNumber", v)}
                />
              </span>
            </span>
            <span>
              <strong>Contact:</strong>{" "}
              <span
                className="invoice-editable-cell"
                style={{ display: "inline-block", minWidth: "80px" }}
              >
                <InlineEdit
                  value={data.firmContact}
                  onChange={(v) => setField("firmContact", v)}
                />
              </span>
            </span>
          </div>
          <div style={{ fontSize: "10px" }}>
            <strong>Shipping Address:</strong>
            <div
              className="invoice-editable-cell"
              style={{ maxWidth: "100%", marginTop: "2px" }}
            >
              <InlineEdit
                value={data.shippingAddress}
                onChange={(v) => setField("shippingAddress", v)}
                multiline
                style={{ textAlign: "center", fontSize: "10px" }}
                textAlign="center"
              />
            </div>
          </div>
        </div>

        {/* Invoice Info Row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "10px",
            marginBottom: "10px",
          }}
        >
          <div>
            <div style={{ marginBottom: "3px" }}>
              <strong>Invoice No:</strong>{" "}
              <span
                className="invoice-editable-cell"
                style={{ display: "inline-block", minWidth: "80px" }}
              >
                <InlineEdit
                  value={data.invoiceNumber}
                  onChange={(v) => setField("invoiceNumber", v)}
                />
              </span>
            </div>
            <div>
              <strong>Date:</strong>{" "}
              <span
                className="invoice-editable-cell"
                style={{ display: "inline-block", minWidth: "120px" }}
              >
                <InlineEdit
                  value={data.date}
                  onChange={(v) => setField("date", v)}
                />
              </span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <strong>Doctor:</strong>{" "}
            <span
              className="invoice-editable-cell"
              style={{ display: "inline-block", minWidth: "100px" }}
            >
              <InlineEdit
                value={data.doctorName}
                onChange={(v) => setField("doctorName", v)}
                textAlign="right"
              />
            </span>
          </div>
        </div>

        {/* Items Table */}
        <div
          style={{
            border: "1px solid black",
            marginBottom: "8px",
            overflow: "visible",
          }}
        >
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: "8.5px",
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              {/* S.No */}
              <col style={{ width: "20px" }} />
              {/* Medicine Name — widest column, wraps to 2 lines */}
              <col style={{ width: "100px" }} />
              {/* Batch */}
              <col style={{ width: "48px" }} />
              {/* Expiry */}
              <col style={{ width: "44px" }} />
              {/* HSN */}
              <col style={{ width: "40px" }} />
              {/* Qty */}
              <col style={{ width: "24px" }} />
              {/* Rate */}
              <col style={{ width: "38px" }} />
              {/* MRP */}
              <col style={{ width: "38px" }} />
              {/* Amount */}
              <col style={{ width: "38px" }} />
              {/* GST */}
              <col style={{ width: "34px" }} />
              {/* Total */}
              <col style={{ width: "40px" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={headerCellStyle}>S.No</th>
                <th style={{ ...headerCellStyle, textAlign: "left" }}>
                  Medicine
                </th>
                <th style={headerCellStyle}>Batch</th>
                <th style={headerCellStyle}>Expiry</th>
                <th style={headerCellStyle}>HSN</th>
                <th style={headerCellStyle}>Qty</th>
                <th style={headerCellStyle}>₹Rate</th>
                <th style={headerCellStyle}>₹MRP</th>
                <th style={headerCellStyle}>₹Amt</th>
                <th style={headerCellStyle}>₹GST</th>
                <th style={headerCellStyle}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: invoice items don't have stable IDs
                <tr key={`inv-edit-item-${index}`}>
                  {/* S.No — centered, single line */}
                  <td
                    style={{
                      ...cellStyle,
                      textAlign: "center",
                      fontWeight: 500,
                    }}
                  >
                    {index + 1}
                  </td>
                  {/* Medicine name: left-aligned, allows 2-line wrap */}
                  <td
                    style={{
                      ...cellStyle,
                      textAlign: "left",
                      minWidth: "80px",
                      wordBreak: "break-word",
                      whiteSpace: "normal",
                    }}
                    className="invoice-editable-cell invoice-medicine-name-cell"
                  >
                    <InlineEdit
                      value={item.medicineName}
                      onChange={(v) => updateItem(index, "medicineName", v)}
                      style={{
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        overflow: "visible",
                        lineHeight: "1.3",
                        textAlign: "left",
                      }}
                    />
                  </td>
                  {/* Batch — centered */}
                  <td
                    style={{ ...cellStyle, textAlign: "center" }}
                    className="invoice-editable-cell invoice-narrow-cell"
                  >
                    <InlineEdit
                      value={item.batchNumber}
                      onChange={(v) => updateItem(index, "batchNumber", v)}
                      style={{ wordBreak: "break-all", textAlign: "center" }}
                      textAlign="center"
                    />
                  </td>
                  {/* Expiry — centered */}
                  <td
                    style={{ ...cellStyle, textAlign: "center" }}
                    className="invoice-editable-cell invoice-narrow-cell"
                  >
                    <InlineEdit
                      value={item.expiryDate}
                      onChange={(v) => updateItem(index, "expiryDate", v)}
                      style={{ wordBreak: "break-all", textAlign: "center" }}
                      textAlign="center"
                    />
                  </td>
                  {/* HSN — centered */}
                  <td
                    style={{ ...cellStyle, textAlign: "center" }}
                    className="invoice-editable-cell invoice-narrow-cell"
                  >
                    <InlineEdit
                      value={item.hsnCode}
                      onChange={(v) => updateItem(index, "hsnCode", v)}
                      style={{ wordBreak: "break-all", textAlign: "center" }}
                      textAlign="center"
                    />
                  </td>
                  {/* Qty — centered */}
                  <td
                    style={{ ...cellStyle, textAlign: "center" }}
                    className="invoice-editable-cell"
                  >
                    <InlineEdit
                      value={item.quantity}
                      onChange={(v) => updateItem(index, "quantity", v)}
                      type="number"
                      textAlign="center"
                    />
                  </td>
                  {/* Rate with ₹ — centered */}
                  <td
                    style={{ ...cellStyle, textAlign: "center" }}
                    className="invoice-editable-cell"
                  >
                    <div className="rupee-cell">
                      <span className="rupee-prefix">₹</span>
                      <InlineEdit
                        value={item.rate}
                        onChange={(v) => updateItem(index, "rate", v)}
                        type="number"
                        textAlign="center"
                        style={{ minWidth: 0 }}
                      />
                    </div>
                  </td>
                  {/* MRP with ₹ — centered */}
                  <td
                    style={{ ...cellStyle, textAlign: "center" }}
                    className="invoice-editable-cell"
                  >
                    <div className="rupee-cell">
                      <span className="rupee-prefix">₹</span>
                      <InlineEdit
                        value={item.mrp !== null ? item.mrp : ""}
                        onChange={(v) => updateItem(index, "mrp", v)}
                        type="number"
                        textAlign="center"
                        style={{ minWidth: 0 }}
                      />
                    </div>
                  </td>
                  {/* Amt with ₹ — centered */}
                  <td
                    style={{ ...cellStyle, textAlign: "center" }}
                    className="invoice-editable-cell"
                  >
                    <div className="rupee-cell">
                      <span className="rupee-prefix">₹</span>
                      <InlineEdit
                        value={item.amount}
                        onChange={(v) => updateItem(index, "amount", v)}
                        type="number"
                        textAlign="center"
                        style={{ minWidth: 0 }}
                      />
                    </div>
                  </td>
                  {/* GST with ₹ — centered */}
                  <td
                    style={{ ...cellStyle, textAlign: "center" }}
                    className="invoice-editable-cell"
                  >
                    <div className="rupee-cell">
                      <span className="rupee-prefix">₹</span>
                      <InlineEdit
                        value={item.gst}
                        onChange={(v) => updateItem(index, "gst", v)}
                        type="number"
                        textAlign="center"
                        style={{ minWidth: 0 }}
                      />
                    </div>
                  </td>
                  {/* Total — centered, bold */}
                  <td
                    style={{
                      ...cellStyle,
                      textAlign: "center",
                      fontWeight: 600,
                    }}
                  >
                    ₹{item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Single-line Subtotal / GST / Grand Total row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "8px",
            padding: "6px 10px",
            border: "1px solid black",
            backgroundColor: "#f3f4f6",
            fontSize: "9.5px",
            flexWrap: "nowrap",
            justifyContent: "flex-end",
          }}
        >
          <span style={{ color: "black", whiteSpace: "nowrap" }}>
            <strong>Subtotal:</strong> ₹{subtotal.toFixed(2)}
          </span>
          <span style={{ color: "#555", margin: "0 4px" }}>|</span>
          <span
            style={{
              color: "black",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              whiteSpace: "nowrap",
            }}
          >
            <strong>GST (5%):</strong>
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              <span style={{ color: "black" }}>₹</span>
              <span
                className="invoice-editable-cell"
                style={{ display: "inline-block", minWidth: "36px" }}
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
                  textAlign="center"
                  style={{ fontSize: "9.5px" }}
                />
              </span>
            </span>
          </span>
          <span style={{ color: "#555", margin: "0 4px" }}>|</span>
          <span style={{ whiteSpace: "nowrap" }}>
            <strong style={{ color: "black", fontSize: "10px" }}>
              Grand Total:
            </strong>{" "}
            <strong style={{ color: "black", fontSize: "12px" }}>
              ₹{grandTotal.toFixed(2)}
            </strong>
          </span>
        </div>

        {/* Save Changes button — hidden when printing */}
        {onSave && (
          <div
            className="print:hidden"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              paddingTop: "8px",
            }}
          >
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
          style={{
            textAlign: "center",
            fontSize: "9px",
            paddingTop: "8px",
            borderTop: "1px solid black",
            color: "black",
          }}
        >
          <div>Thank you for your business!</div>
          <div style={{ marginTop: "2px" }}>
            This is a computer-generated invoice and does not require a
            signature.
          </div>
        </div>
      </div>
    </div>
  );
}
