import mongoose from "mongoose";
import { Buyer } from "./Buyer.model.js";

const AddressSchema = new mongoose.Schema(
    {
        addressId: {
            type: String,
            unique: true,
            index: true,
        },

        buyerId: {
            type: String,
            required: true,
            ref: "Buyer",
            index: true,
        },

        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        streetAddress: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        phone: { type: String, required: true },
    },
    { timestamps: true }
);


AddressSchema.pre("save", async function (next) {
    try {

        if (this.isNew && !this.addressId && this.buyerId) {

            const buyer = await Buyer.findOne({ buyerId: this.buyerId });
            if (!buyer) throw new Error("Buyer not found");


            const count = await mongoose.models.Address.countDocuments({
                buyerId: this.buyerId,
            });

            // 3️⃣ Generate sequence
            const addrNumber = String(count + 1).padStart(4, "0");

            // 4️⃣ Final ID format
            this.addressId = `${this.buyerId}A${addrNumber}`;
        }

        next();
    } catch (error) {
        next(error);
    }
});

export const Address =
    mongoose.models.Address || mongoose.model("Address", AddressSchema);