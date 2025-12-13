import { buyerResolvers } from "./Buyer.resolver.js";
import { sellerResolvers } from "./Seller.resolver.js";
import { hirePilotResolvers } from "./Hirepilot.resolver.js";
export const subscriptionResolvers = {
  Subscription: {
    ...buyerResolvers.Subscription,
    ...sellerResolvers.Subscription,
    ...hirePilotResolvers.Subscription,
  },
};
