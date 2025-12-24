import { droneResolvers } from "../Drone.resolver.js";
import { partResolvers } from "../Parts.resolver.js";
import { accessoryResolvers } from "../Accessories.resolver.js";
import { rentalResolvers } from "../Rental.resolver.js";
import { jobApplicationResolvers } from "../JobBooking.resolver.js";
import { rentalBookingResolvers } from "../Buyer_Booking_Pilot_Rental.resolver.js";
import { droneRentalBookingResolvers } from "../Buyer_Booking_Drone_Rental.resolver.js";
import { hirePilotResolvers } from "../Hirepilot.resolver.js";
import { pilotBookingResolvers } from "../Pilot_Booking.resolver.js";
import { jobResolvers } from "../Hirejob.resolver.js";
import { orderResolvers } from "../Order.resolver.js";
import { returnResolvers } from "../Return.resolver.js";
import { serviceResolvers } from "../Service.resolver.js";
import { regulatoryResolvers } from "../Regulatory.resolver.js";
import { buyerResolvers } from "../Buyer.resolver.js";
import { sellerResolvers } from "../Seller.resolver.js";
import { trainingResolvers } from "../Training.resolver.js";
import { taxResolvers } from "../Tax.resolver.js";
import { ServiceBookingResolvers } from "../Service_Book_Now.resolver.js";
import { subscriptionResolvers } from "../subscriptionResolvers.js";
import { cartResolvers } from "../Cart.resolver.js";
import { wishlistResolvers } from "../Wishlist.resolver.js";
import { productResolvers } from "../Product.resolver.js";
import { addressResolvers } from "../BuyerAddress.resolver.js";
import { discountResolvers } from "../DiscountSet.resolver.js";
import { getSellerViewResolver } from "../../resolvers/SellerView.resolver.js";
import { globalSearchResolver } from "../GlobalSearch.resolver.js";
import { adminResolvers } from "../Admin.resolver.js";


export const resolves = [
  droneResolvers,
  partResolvers,
  accessoryResolvers,
  rentalResolvers,
  hirePilotResolvers,
  pilotBookingResolvers,
  jobResolvers,
  orderResolvers,
  returnResolvers,
  serviceResolvers,
  regulatoryResolvers,
  buyerResolvers,
  sellerResolvers,
  taxResolvers,
  trainingResolvers,
  jobApplicationResolvers,
  rentalBookingResolvers,
  droneRentalBookingResolvers,
  ServiceBookingResolvers,
  subscriptionResolvers,
  cartResolvers,
  wishlistResolvers,
  productResolvers,
  addressResolvers,
  discountResolvers,
  getSellerViewResolver,
  globalSearchResolver,
  adminResolvers
];
