import { BuyerPilot } from "../models/BuyerPilot.model.js";
import { Buyer } from "../models/Buyer.model.js";

const baseLookup = [
    {
        $lookup: {
            from: "buyers",
            localField: "buyerId",
            foreignField: "buyerId",
            as: "buyerDetails",
        },
    },
    { $unwind: { path: "$buyerDetails", preserveNullAndEmptyArrays: true } },
    {
        $project: {
            buyerPilotId: 1,
            pilotName: 1,
            pilotCompany: 1,
            location: 1,
            availability: 1,
            specification: 1,
            price: 1,
            profilePhoto: 1,
            certifications: 1,
            description: 1,
            newemail: 1,
            newphoneNumber: 1,
            adminStatus: 1,
            buyerStatus: 1,
            buyerId: 1,
            buyer: {
                buyerId: "$buyerDetails.buyerId",
                name: "$buyerDetails.name",
                email: "$buyerDetails.email",
                phoneNumber: "$buyerDetails.phoneNumber",
            },
        },
    },
];

export const buyerPilotResolvers = {
    Query: {
        buyerPilots: async () => BuyerPilot.aggregate(baseLookup),

        buyerPilot: async (_, { buyerPilotId }) => {
            const res = await BuyerPilot.aggregate([
                { $match: { buyerPilotId } },
                ...baseLookup,
            ]);
            return res[0] || null;
        },

        buyerPilotsByBuyer: async (_, { buyerId }) =>
            BuyerPilot.aggregate([{ $match: { buyerId } }, ...baseLookup]),
    },

    Mutation: {
        addBuyerPilot: async (_, { input }) => {
            const buyer = await Buyer.findOne({ buyerId: input.buyerId });
            if (!buyer) throw new Error("Buyer not found");

            const pilot = new BuyerPilot(input);
            await pilot.save();

            const res = await BuyerPilot.aggregate([
                { $match: { _id: pilot._id } },
                ...baseLookup,
            ]);

            return res[0];
        },

        adminUpdateBuyerPilotStatus: async (_, { buyerPilotId, adminStatus }) =>
            BuyerPilot.findOneAndUpdate(
                { buyerPilotId },
                { adminStatus },
                { new: true }
            ),

        buyerUpdateBuyerPilotStatus: async (_, { buyerPilotId, buyerStatus }) =>
            BuyerPilot.findOneAndUpdate(
                { buyerPilotId },
                { buyerStatus },
                { new: true }
            ),

        deleteBuyerPilot: async (_, { buyerPilotId }) => {
            await BuyerPilot.findOneAndDelete({ buyerPilotId });
            return true;
        },
    },
};
