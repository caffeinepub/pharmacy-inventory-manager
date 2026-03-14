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
  amount: number;
  gst: number;
  total: number;
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
  gstOverride: number | null;
}

export function buildEditableInvoice(
  invoice: Invoice,
  firmSettings: FirmSettings | undefined,
  medicines: Medicine[],
  doctors: { name: string; shippingAddress: string; dilNumber?: string }[],
): EditableInvoiceData {
  const doctor = doctors.find((d) => d.name === invoice.doctorName);
  const shippingAddress =
    doctor?.shippingAddress || firmSettings?.defaultShippingAddress || "";

  const items: EditableItem[] = invoice.items.map((item: InvoiceItem) => {
    const qty = Number(item.quantity);
    const rate = Number(item.sellingPrice);
    const amount = Number.parseFloat((qty * rate).toFixed(2));
    // GST rounded to whole rupees using standard math rounding
    const gst = Math.round((amount * 5) / 100);
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

  // Total GST = Math.round(subtotal * 5 / 100)
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const totalGst = Math.round((subtotal * 5) / 100);

  return {
    firmName: firmSettings?.name || "PharmaCare",
    firmAddress: firmSettings?.address || "",
    firmGstin: firmSettings?.gstin || "",
    firmDilNumber: doctor?.dilNumber?.trim() ? doctor.dilNumber : "N/A",
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
  doctors: { name: string; shippingAddress: string; dilNumber?: string }[];
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

  useEffect(() => {
    setData(buildEditableInvoice(invoice, firmSettings, medicines, doctors));
  }, [invoice, firmSettings, medicines, doctors]);

  const subtotal = data.items.reduce((s, item) => s + item.amount, 0);
  const computedGst = Math.round((subtotal * 5) / 100);
  const activeGst =
    data.gstOverride !== null ? Math.round(data.gstOverride) : computedGst;
  const grandTotal = subtotal + activeGst;

  const setField = (field: keyof EditableInvoiceData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

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
        item.gst = Math.round((amount * 5) / 100);
        item.total = Number.parseFloat((amount + item.gst).toFixed(2));
      } else if (field === "rate") {
        const rate = Number.parseFloat(rawValue) || 0;
        item.rate = rate;
        const amount = Number.parseFloat((item.quantity * rate).toFixed(2));
        item.amount = amount;
        item.gst = Math.round((amount * 5) / 100);
        item.total = Number.parseFloat((amount + item.gst).toFixed(2));
      } else if (field === "mrp") {
        item.mrp = Number.parseFloat(rawValue) || 0;
      } else if (field === "gst") {
        const gst = Number.parseFloat(rawValue) || 0;
        item.gst = gst;
        item.total = Number.parseFloat((item.amount + gst).toFixed(2));
      } else if (field === "amount") {
        const amount = Number.parseFloat(rawValue) || 0;
        item.amount = amount;
        item.gst = Math.round((amount * 5) / 100);
        item.total = Number.parseFloat((amount + item.gst).toFixed(2));
      }

      items[index] = item;
      return { ...prev, items };
    });
  };

  const INVOICE_WIDTH_PX = 560;

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
          .invoice-print-container input,
          .invoice-print-container textarea {
            box-sizing: border-box !important;
            overflow: visible !important;
            line-height: 1.4 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .invoice-print-container td,
          .invoice-print-container th {
            word-break: break-word !important;
            white-space: normal !important;
            overflow: visible !important;
          }
          .invoice-medicine-name-cell { min-width: 80px; max-width: 110px; }
          .invoice-narrow-cell { min-width: 40px; }
          .invoice-editable-cell input:hover,
          .invoice-editable-cell textarea:hover {
            background-color: rgba(0,0,0,0.03) !important;
          }
          .invoice-editable-cell input:focus,
          .invoice-editable-cell textarea:focus {
            border-bottom: 1.5px solid #374151 !important;
            background-color: rgba(0,0,0,0.04) !important;
          }
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
            html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
            [role="dialog"] {
              position: static !important; width: 100% !important; height: auto !important;
              max-height: none !important; overflow: visible !important; border: none !important;
              box-shadow: none !important; background: white !important;
              transform: none !important; animation: none !important;
            }
            [role="dialog"] > * { display: none !important; }
            .invoice-print-container {
              display: block !important; width: 148mm !important; padding: 8mm !important;
              box-sizing: border-box !important; background: white !important;
              color: black !important; margin: 0 auto !important;
            }
            .invoice-print-container * { display: revert !important; }
            @page { size: A5 portrait; margin: 0; }
            .invoice-print-container h1 { font-size: 16px !important; }
            .invoice-print-container p,
            .invoice-print-container td,
            .invoice-print-container th { font-size: 8px !important; }
            .invoice-print-container table { font-size: 7px !important; width: 100% !important; }
            .invoice-print-container table td,
            .invoice-print-container table th { padding: 1mm 1.5mm !important; }
            .print\\:hidden { display: none !important; }
            input, textarea { border-bottom: none !important; }
          }
        `}
      </style>

      <div
        className="invoice-container"
        style={{
          width: `${INVOICE_WIDTH_PX}px`,
          height: "auto",
          boxSizing: "border-box",
          background: "white",
          color: "black",
          padding: "20px 24px",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: "11px",
          lineHeight: "1.4",
          margin: "0 auto",
          overflow: "visible",
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

          {/* GST / DIL / Contact — flex-wrap so nothing clips */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
              fontSize: "9.5px",
              marginBottom: "4px",
              overflow: "visible",
              color: "black",
            }}
          >
            <span
              style={{
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                color: "black",
              }}
            >
              <strong style={{ color: "black" }}>GSTIN:</strong>
              <span
                className="invoice-editable-cell"
                style={{
                  display: "inline-block",
                  minWidth: "60px",
                  maxWidth: "140px",
                }}
              >
                <InlineEdit
                  value={data.firmGstin}
                  onChange={(v) => setField("firmGstin", v)}
                  style={{ fontSize: "9.5px", color: "black" }}
                />
              </span>
            </span>
            <span style={{ color: "#888" }}>|</span>
            <span
              style={{
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                color: "black",
              }}
            >
              <strong style={{ color: "black" }}>DIL No:</strong>
              <span
                className="invoice-editable-cell"
                style={{
                  display: "inline-block",
                  minWidth: "50px",
                  maxWidth: "120px",
                }}
              >
                <InlineEdit
                  value={data.firmDilNumber}
                  onChange={(v) => setField("firmDilNumber", v)}
                  style={{ fontSize: "9.5px", color: "black" }}
                />
              </span>
            </span>
            <span style={{ color: "#888" }}>|</span>
            <span
              style={{
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                color: "black",
              }}
            >
              <strong style={{ color: "black" }}>Contact:</strong>
              <span
                className="invoice-editable-cell"
                style={{
                  display: "inline-block",
                  minWidth: "70px",
                  maxWidth: "140px",
                }}
              >
                <InlineEdit
                  value={data.firmContact}
                  onChange={(v) => setField("firmContact", v)}
                  style={{ fontSize: "9.5px", color: "black" }}
                />
              </span>
            </span>
          </div>

          <div style={{ fontSize: "10px", color: "black" }}>
            <strong style={{ color: "black" }}>Shipping Address:</strong>
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
            color: "black",
          }}
        >
          <div>
            <div style={{ marginBottom: "3px" }}>
              <strong style={{ color: "black" }}>Invoice No:</strong>{" "}
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
              <strong style={{ color: "black" }}>Date:</strong>{" "}
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
            <strong style={{ color: "black" }}>Doctor:</strong>{" "}
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
              <col style={{ width: "20px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "48px" }} />
              <col style={{ width: "44px" }} />
              <col style={{ width: "40px" }} />
              <col style={{ width: "24px" }} />
              <col style={{ width: "38px" }} />
              <col style={{ width: "38px" }} />
              <col style={{ width: "38px" }} />
              <col style={{ width: "34px" }} />
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
                  <td
                    style={{
                      ...cellStyle,
                      textAlign: "center",
                      fontWeight: 500,
                    }}
                  >
                    {index + 1}
                  </td>
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
            color: "black",
          }}
        >
          <span style={{ color: "black", whiteSpace: "nowrap" }}>
            <strong style={{ color: "black" }}>Subtotal:</strong> ₹
            {subtotal.toFixed(2)}
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
            <strong style={{ color: "black" }}>GST (5%):</strong>
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
                      gstOverride: Math.round(Number.parseFloat(v) || 0),
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

        {/* Save Changes button */}
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
          <div style={{ color: "black" }}>Thank you for your business!</div>
          <div style={{ marginTop: "2px", color: "black" }}>
            This is a computer-generated invoice and does not require a
            signature.
          </div>
        </div>
      </div>
    </div>
  );
}
