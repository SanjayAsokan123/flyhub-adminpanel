import PDFDocument from "pdfkit";
import { Buffer } from "buffer";

export async function generateSellerPackingSlipBuffer(order, sellerId) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // ================= HEADER =================
      doc.fontSize(18).text("PACKING SLIP", { align: "center" });
      doc.moveDown();

      doc.fontSize(12)
        .text(`Order ID: ${order.orderId}`)
        .text(`Seller ID: ${sellerId}`)
        .text(`Order Date: ${new Date(order.createdAt).toDateString()}`);

      doc.moveDown();

      // ================= BUYER =================
      doc.fontSize(14).text("Delivery Details", { underline: true });
      doc.fontSize(12)
        .text(order.buyer.name)
        .text(order.buyer.phone)
        .text(order.buyer.address);

      doc.moveDown();

      // ================= ITEMS =================
      doc.fontSize(14).text("Items", { underline: true });
      doc.moveDown(0.5);

      const sellerItems = order.items.filter(
        (i) => i.sellerId === sellerId
      );

      sellerItems.forEach((item, i) => {
        doc.text(`${i + 1}. ${item.name} | Qty: ${item.quantity}`);
      });

      doc.moveDown(2);

      // ================= FOOTER =================
      doc.fontSize(10).text(
        "This is a system-generated packing slip.",
        { align: "center" }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
