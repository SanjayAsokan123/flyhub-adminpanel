import PDFDocument from "pdfkit";
import { uploadToFirebase } from "../uploadToFirebase.js";
import { generateInvoiceNumber } from "./invoiceNumber.js";
import { calculateGST } from "./gstCalculator.js";

export async function generateInvoicePDF(order) {
  const invoiceNo = await generateInvoiceNumber();
  const gst = calculateGST(order);

  // 📄 Create PDF in memory
  const doc = new PDFDocument({ margin: 40 });
  const chunks = [];

  doc.on("data", chunk => chunks.push(chunk));
  doc.on("end", async () => {});

  /* ---------- HEADER ---------- */
  doc.fontSize(18).text("Flyhub Technologies Pvt Ltd", { align: "center" });
  doc.fontSize(10).text("GSTIN: 29ABCDE1234F1Z5", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text(`Invoice No: ${invoiceNo}`);
  doc.text(`Order ID: ${order.orderId}`);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`);
  doc.moveDown();

  /* ---------- CUSTOMER ---------- */
  doc.text(`Customer: ${order.buyer.name}`);
  doc.text(`Phone: ${order.buyer.phone}`);
  doc.text(`Email: ${order.buyer.email}`);
  doc.text(`Address: ${order.buyer.address}`);
  doc.moveDown();

  /* ---------- ITEMS ---------- */
  order.items.forEach(item => {
    doc.text(
      `${item.name} × ${item.quantity}   ₹${item.price * item.quantity}`
    );
  });

  doc.moveDown();

  /* ---------- GST ---------- */
  doc.text(`Subtotal: ₹${gst.subTotal}`);
  doc.text(`CGST (9%): ₹${gst.cgst}`);
  doc.text(`SGST (9%): ₹${gst.sgst}`);
  doc.fontSize(12).text(`Total: ₹${gst.total}`, { bold: true });

  doc.end();

  // 🧠 Convert to Buffer
  const pdfBuffer = Buffer.concat(chunks);

  // ☁ Upload directly to Firebase
  const invoiceUrl = await uploadToFirebase(
    {
      buffer: pdfBuffer,
      mimetype: "application/pdf",
      originalname: `invoice-${invoiceNo}.pdf`,
    },
    "invoices"
  );

  return { invoiceNo, invoiceUrl };
}
