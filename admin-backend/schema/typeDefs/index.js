// typeDefs/index.js

import { baseTypeDefs } from "./baseTypeDefs.js";
import { droneTypeDefs } from "../Drone.schema.js";
import { partTypeDefs } from "../Parts.schema.js";
import { accessoryTypeDefs } from "../Accessories.schema.js";
import { rentalTypeDefs } from "../Rental.schema.js";
import { rentalBookingTypeDefs }  from "../Buyer_Booking_Pilot_Rental.schema.js";
import { dronerentalBookingTypeDefs } from "../Buyer_Booking_Drone_Rental.schema.js";
import { jobApplicationTypeDefs } from "../JobBooking.schema.js";
import { hirePilotTypeDefs } from "../Hirepilot.schema.js";
import { pilotBookingTypeDefs } from "../Pilot_Booking.schema.js";
import { jobTypeDefs } from "../Hirejob.schema.js";
import { orderTypeDefs } from "../Order.schema.js";
import { returnTypeDefs } from "../Return.schema.js";
import { serviceTypeDefs } from "../Service.schema.js";
import { regulatoryTypeDefs } from "../Regulatory.schema.js";
import { buyerTypeDefs } from "../Buyer.schema.js";
import { sellerTypeDefs } from "../Seller.schema.js";
import { trainingTypeDefs } from "../Training.schema.js";
import { taxTypeDefs } from "../Tax.schema.js";
import { ServiceBookingTypeDefs } from "../Service_Book_Now.schema.js";
import { cartTypeDefs } from "../Cart.schema.js";
import { wishlistTypeDefs } from "../Wishlist.schema.js";
import { productTypeDef } from "../Product.schema.js";
import { addressTypeDefs } from "../BuyerAddress.schema.js";

export const typeDefs = [
  baseTypeDefs,
  droneTypeDefs,
  partTypeDefs,
  accessoryTypeDefs,
  rentalTypeDefs,
  hirePilotTypeDefs,
  pilotBookingTypeDefs,
  jobTypeDefs,
  orderTypeDefs,
  returnTypeDefs,
  serviceTypeDefs,
  regulatoryTypeDefs,
  buyerTypeDefs,
  sellerTypeDefs,
  taxTypeDefs,
  trainingTypeDefs,
  rentalBookingTypeDefs,
  dronerentalBookingTypeDefs,
  jobApplicationTypeDefs,
  ServiceBookingTypeDefs,
  cartTypeDefs,
  wishlistTypeDefs,
  productTypeDef,
  addressTypeDefs,
];
