// models/BankIFSC.model.js
import mongoose from "mongoose";

const BankIFSCSchema = new mongoose.Schema(
  {
    bankName: { type: String, required: true, index: true },
    branchName: { type: String, required: true, index: true },
    ifsc: { type: String, required: true, unique: true },
    micr: { type: String },
    address: { type: String },
    city: { type: String },
    district: { type: String },
    state: { type: String },
  },
  { timestamps: true }
);

// Compound index for fast bank + branch search
BankIFSCSchema.index({ bankName: 1, branchName: 1 });

export const BankIFSC =
  mongoose.models.BankIFSC || mongoose.model("BankIFSC", BankIFSCSchema);
