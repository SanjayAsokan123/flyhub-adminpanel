import { Counter } from "../../models/Counter.model.js";

export async function generateInvoiceNumber() {
  const counter = await Counter.findOneAndUpdate(
    { key: "invoice" },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  const year = new Date().getFullYear();
  return `FLY-${year}-${counter.value.toString().padStart(6, "0")}`;
}
