
import mongoose from "mongoose";
import fs from "fs";
import csvParser from "csv-parser";
import dotenv from "dotenv";
import { BankIFSC } from "../models/BankIFSC.model.js"; 

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI not found in .env");
  process.exit(1);
}

async function importIFSC() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("✅ Connected to MongoDB");

  const results = [];

  fs.createReadStream("./scripts/ifsc_data.csv")
    .pipe(csvParser())
    .on("data", (row) => {
      results.push({
        bankName: row.BANK?.trim(),
        branchName: row.BRANCH?.trim(),
        ifsc: row.IFSC?.trim(),
        micr: row.MICR?.trim() || "",
        address: row.ADDRESS?.trim() || "",
        city: row.CITY?.trim() || "",
        district: row.DISTRICT?.trim() || "",
        state: row.STATE?.trim() || "",
      });
    })
    .on("end", async () => {
      console.log(`📥 Parsed ${results.length} rows`);

      try {
        await BankIFSC.insertMany(results, { ordered: false });
        console.log("✅ IFSC data imported successfully!");
      } catch (err) {
        console.error(
          "⚠ Some records may have failed (likely duplicates):",
          err.message
        );
      } finally {
        mongoose.disconnect();
        console.log("🔌 MongoDB disconnected");
      }
    });
}

importIFSC();
