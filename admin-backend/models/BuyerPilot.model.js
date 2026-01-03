import mongoose from "mongoose";
import { Buyer } from "./Buyer.model.js";
const certificationSchema = new mongoose.Schema({
    url: { type: String, required: true },
});
const fileSchema = new mongoose.Schema({
    url: { type: String, required: true },
});
const buyerPilotSchema = new mongoose.Schema(
    {
        buyerPilotId: {
            type: String,
            unique: true,
            index: true,
        },
        pilotName: { type: String, required: true },
        pilotCompany: String,
        location: String,
        availability: { type: Boolean, default: true },
        specification: String,
        price: {
            perHour: { type: Number, required: true },
            perDay: { type: Number, required: true },
        },
        profilePhoto: fileSchema,
        certifications: [certificationSchema],
        description: String,
        newemail: { type: String, required: true },
        newphoneNumber: { type: String, required: true },
        adminStatus: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        buyerStatus: {
            type: String,
            enum: ["pending", "confirmed", "cancelled", "completed"],
            default: "pending",
        },

        buyerId: { type: String, required: true },
    },
    { timestamps: true }
);
buyerPilotSchema.pre("save", async function (next) {
    if (this.isNew && !this.buyerPilotId && this.buyerId) {
        const buyer = await Buyer.findOne({ buyerId: this.buyerId });
        if (!buyer) throw new Error("Buyer not found");
        const count = await mongoose.models.BuyerPilot.countDocuments({
            buyerId: this.buyerId,
        });
        const number = String(count + 1).padStart(3, "0");
        this.buyerPilotId = `${buyer.buyerId}BP${number}`;
        if (!this.newemail) this.newemail = buyer.email;
        if (!this.newphoneNumber) this.newphoneNumber = buyer.phoneNumber;
    }
    next();
});
export const BuyerPilot =
    mongoose.models.BuyerPilot ||
    mongoose.model("BuyerPilot", buyerPilotSchema);
