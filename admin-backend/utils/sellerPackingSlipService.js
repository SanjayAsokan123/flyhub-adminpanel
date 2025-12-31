// utils/sellerPackingSlipService.js
import { generateSellerPackingSlipBuffer } from "../utils/invoice/generateSellerPackingSlipBuffer.js";
import { uploadPdfBuffer } from "../utils/uploadToFirebase.js";

export async function createSellerPackingSlip(order, sellerId) {
  const pdfBuffer = await generateSellerPackingSlipBuffer(order, sellerId);

  const fileName = `PACKING-${order.orderId}-${sellerId}.pdf`;
  const url = await uploadPdfBuffer(pdfBuffer, fileName);

  return url;
}
