import type { CreditNote, FirmSettings, Medicine } from "../backend.d";

interface CreditNotePreviewProps {
  creditNote: CreditNote;
  firmSettings: FirmSettings | undefined;
  medicines: Medicine[];
  doctors: { name: string; shippingAddress: string }[];
}

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
  backgroundColor: "#fde8e8",
  fontWeight: 600,
  whiteSpace: "nowrap",
  verticalAlign: "middle",
  textAlign: "center",
  fontSize: "8px",
  padding: "4px 3px",
};

function statusLabel(status: string): string {
  if (status === "apply_to_balance") return "Applied to Balance";
  if (status === "refund") return "Refund";
  if (status === "carry_forward") return "Carried Forward";
  return status;
}

export default function CreditNotePreview({
  creditNote,
  firmSettings,
  medicines,
  doctors,
}: CreditNotePreviewProps) {
  const doctor = doctors.find((d) => d.name === creditNote.doctorName);
  const shippingAddress =
    doctor?.shippingAddress || firmSettings?.defaultShippingAddress || "";

  const subtotal = Number(creditNote.subtotal);
  const gstAmount = Number(creditNote.gstAmount);
  const grandTotal = Number(creditNote.grandTotal);

  const date = new Date(
    Number(creditNote.timestamp) / 1_000_000,
  ).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const cnNumber = creditNote.creditNoteNumber.toString().padStart(6, "0");
  const invNumber = creditNote.linkedInvoiceNumber.toString().padStart(6, "0");

  return (
    <div className="credit-note-print-container">
      <style>
        {`
          .credit-note-print-container td,
          .credit-note-print-container th {
            word-break: break-word !important;
            white-space: normal !important;
            overflow: visible !important;
          }
          .cn-medicine-name-cell { min-width: 80px; max-width: 110px; }
          .cn-narrow-cell { min-width: 40px; }
          @media print {
            html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
            .credit-note-print-container {
              display: block !important; width: 148mm !important; padding: 8mm !important;
              box-sizing: border-box !important; background: white !important;
              color: black !important; margin: 0 auto !important;
            }
            @page { size: A5 portrait; margin: 0; }
            .print\\:hidden { display: none !important; }
          }
        `}
      </style>

      <div
        className="credit-note-container"
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
        {/* Red accent bar */}
        <div
          style={{
            backgroundColor: "#dc2626",
            color: "white",
            textAlign: "center",
            padding: "4px 0",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "2px",
            marginBottom: "8px",
          }}
        >
          CREDIT NOTE
        </div>

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
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              color: "black",
              marginBottom: "4px",
            }}
          >
            {firmSettings?.name || "PharmaCare"}
          </div>
          <div
            style={{ fontSize: "10px", color: "black", marginBottom: "4px" }}
          >
            {firmSettings?.address || ""}
          </div>

          {/* GST / DIL / Contact */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
              fontSize: "9.5px",
              marginBottom: "4px",
              color: "black",
            }}
          >
            <span style={{ whiteSpace: "nowrap", color: "black" }}>
              <strong style={{ color: "black" }}>GSTIN:</strong>{" "}
              {firmSettings?.gstin || ""}
            </span>
            <span style={{ color: "#888" }}>|</span>
            <span style={{ whiteSpace: "nowrap", color: "black" }}>
              <strong style={{ color: "black" }}>DIL No:</strong>{" "}
              {firmSettings?.dilNumber?.trim() ? firmSettings.dilNumber : "N/A"}
            </span>
            <span style={{ color: "#888" }}>|</span>
            <span style={{ whiteSpace: "nowrap", color: "black" }}>
              <strong style={{ color: "black" }}>Contact:</strong>{" "}
              {firmSettings?.contact || ""}
            </span>
          </div>

          <div style={{ fontSize: "10px", color: "black" }}>
            <strong style={{ color: "black" }}>Shipping Address:</strong>{" "}
            {shippingAddress}
          </div>
        </div>

        {/* Credit Note Info Row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "10px",
            marginBottom: "8px",
            color: "black",
            flexWrap: "wrap",
            gap: "4px",
          }}
        >
          <div>
            <div style={{ marginBottom: "3px" }}>
              <strong style={{ color: "black" }}>CN No:</strong>{" "}
              <span style={{ color: "#dc2626", fontWeight: 700 }}>
                CN-{cnNumber}
              </span>
            </div>
            <div style={{ marginBottom: "3px" }}>
              <strong style={{ color: "black" }}>Against Invoice:</strong>{" "}
              <span style={{ color: "black" }}>INV-{invNumber}</span>
            </div>
            <div>
              <strong style={{ color: "black" }}>Date:</strong> {date}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ marginBottom: "3px" }}>
              <strong style={{ color: "black" }}>Doctor:</strong>{" "}
              {creditNote.doctorName}
            </div>
            <div style={{ marginBottom: "3px" }}>
              <strong style={{ color: "black" }}>Status:</strong>{" "}
              <span
                style={{
                  color:
                    creditNote.status === "refund"
                      ? "#16a34a"
                      : creditNote.status === "carry_forward"
                        ? "#d97706"
                        : "#2563eb",
                  fontWeight: 600,
                }}
              >
                {statusLabel(creditNote.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div
          style={{
            border: "1px solid #dc2626",
            borderRadius: "4px",
            padding: "6px 10px",
            marginBottom: "8px",
            fontSize: "9.5px",
            color: "black",
            background: "#fff5f5",
          }}
        >
          <strong style={{ color: "#dc2626" }}>Reason:</strong>{" "}
          {creditNote.reason}
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
              {creditNote.items.map((item, index) => {
                const qty = Number(item.quantity);
                const rate = Number(item.sellingPrice);
                const amount = Number(item.amount);
                const itemGst = Math.round((amount * 5) / 100);
                const total = amount + itemGst;
                const medicine = medicines.find(
                  (m) => m.name === item.medicineName,
                );
                const mrp = medicine ? Number(medicine.mrp) : null;

                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: credit note items
                  <tr key={`cn-item-${index}`}>
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
                      className="cn-medicine-name-cell"
                    >
                      {item.medicineName}
                    </td>
                    <td
                      style={{ ...cellStyle, textAlign: "center" }}
                      className="cn-narrow-cell"
                    >
                      {item.batchNumber}
                    </td>
                    <td
                      style={{ ...cellStyle, textAlign: "center" }}
                      className="cn-narrow-cell"
                    >
                      {item.expiryDate}
                    </td>
                    <td
                      style={{ ...cellStyle, textAlign: "center" }}
                      className="cn-narrow-cell"
                    >
                      {item.hsnCode}
                    </td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>{qty}</td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>
                      ₹{rate.toFixed(2)}
                    </td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>
                      {mrp !== null ? `₹${mrp.toFixed(2)}` : "—"}
                    </td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>
                      ₹{amount.toFixed(2)}
                    </td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>
                      ₹{itemGst}
                    </td>
                    <td
                      style={{
                        ...cellStyle,
                        textAlign: "center",
                        fontWeight: 600,
                        color: "#dc2626",
                      }}
                    >
                      ₹{total.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "8px",
            padding: "6px 10px",
            border: "1px solid #dc2626",
            backgroundColor: "#fff5f5",
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
          <span style={{ color: "#888", margin: "0 4px" }}>|</span>
          <span style={{ color: "black", whiteSpace: "nowrap" }}>
            <strong style={{ color: "black" }}>GST (5%):</strong> ₹{gstAmount}
          </span>
          <span style={{ color: "#888", margin: "0 4px" }}>|</span>
          <span style={{ whiteSpace: "nowrap" }}>
            <strong style={{ color: "#dc2626", fontSize: "10px" }}>
              Credit Total:
            </strong>{" "}
            <strong style={{ color: "#dc2626", fontSize: "12px" }}>
              ₹{grandTotal.toFixed(2)}
            </strong>
          </span>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            fontSize: "9px",
            paddingTop: "8px",
            borderTop: "1px solid #dc2626",
            color: "black",
          }}
        >
          <div style={{ color: "#dc2626", fontWeight: 600 }}>
            This is a computer-generated credit note.
          </div>
          <div style={{ marginTop: "2px", color: "black" }}>
            This credit note does not require a signature.
          </div>
        </div>
      </div>
    </div>
  );
}
