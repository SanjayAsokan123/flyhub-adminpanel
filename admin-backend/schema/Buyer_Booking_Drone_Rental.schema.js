import { gql } from "apollo-server-express";

export const dronerentalBookingTypeDefs = gql`
  scalar Date
  type DroneRental {
    drone_rental_id: String
    name: String!
    phone: String!
    location: String!
    rentalDate: String!
    rentalId: String!
    sellerId: String
    sellerEmail: String
    sellerPhone: String
    sellerName:String
    status: String
    buyerId:String!
    createdAt: Date
    updatedAt: Date
  }
type Buyer
{
 firebaseUid: String,
 buyerId:String,
 name:String,
}

 type DeleteResponse {
  success: Boolean!
  message: String!
}


  extend type Query {
    getAllDroneRentals: [DroneRental]
    getDroneRentalById(drone_rental_id: String!): DroneRental
    getDroneRentalsBySellerId(sellerId: String!): [DroneRental]
    getDroneRentalsByBuyerId(buyerId: String!): [DroneRental]


    getConfirmedDroneRentalsByBuyer(buyerId: String!): [DroneRental]
    getPendingDroneRentalsByBuyer(buyerId: String!): [DroneRental]
    getCancelledDroneRentalsByBuyer(buyerId: String!): [DroneRental]
    getBuyerfirebaseUidInDroneRental(firebaseUid: String!): Buyer
  }

  extend type Mutation {
    createDroneRental(
      name: String!
      phone: String!
      location: String!
      rentalDate: String!
      rentalId: String!
      buyerId: String
    ): DroneRental

    updateDroneRentalContact(
      drone_rental_id: String!
      phone: String
      location: String
    ): DroneRental

    updateDroneRentalId(
      drone_rental_id: String!
      rentalId: String!
    ): DroneRental

    deleteDroneRentalByBuyer(
  drone_rental_id: String!
): DeleteResponse


    updateDroneRentalStatus(
      drone_rental_id: String!
      status: String!
    ): DroneRental
  }
`;