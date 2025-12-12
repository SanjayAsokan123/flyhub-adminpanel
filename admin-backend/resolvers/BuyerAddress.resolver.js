import { Address } from "../models/BuyerAddress.model.js";
import { Buyer } from "../models/Buyer.model.js";

export const addressResolvers = {
    Query: {

        getAddressesByBuyer: async (_, { buyerId }) => {
            return await Address.find({ buyerId }).sort({ createdAt: -1 });
        },


        getAddressById: async (_, { addressId }) => {
            return await Address.findOne({ addressId });
        },
        getAllBuyers: async () => {
            const buyers = await Buyer.find();

            // For each buyer, fetch their addresses
            const buyersWithAddresses = await Promise.all(
                buyers.map(async (buyer) => {
                    const addresses = await Address.find({ buyerId: buyer.buyerId }).sort({ createdAt: -1 });
                    return {
                        id: buyer._id,
                        buyerId: buyer.buyerId,
                        name: buyer.name,
                        email: buyer.email,
                        phone: buyer.phone,
                        addresses
                    };
                })
            );

            return buyersWithAddresses;
        }
    },

    Mutation: {

        createAddress: async (_, { input }) => {
            const { buyerId } = input;


            const buyer = await Buyer.findOne({ buyerId });
            if (!buyer) throw new Error("Buyer not found");


            const newAddress = new Address(input);
            await newAddress.save();

            return newAddress;
        },


        updateAddress: async (_, { addressId, input }) => {
            const updated = await Address.findOneAndUpdate(
                { addressId },
                input,
                { new: true }
            );

            if (!updated) throw new Error("Address not found");
            return updated;
        },


        deleteAddress: async (_, { addressId }) => {
            const deleted = await Address.findOneAndDelete({ addressId });
            return deleted ? true : false;
        },
    },
};