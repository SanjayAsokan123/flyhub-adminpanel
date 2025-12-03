import { gql } from "apollo-server-express";

export const dronerentalBookingTypeDefs = gql`
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
    status: String
    createdAt: String
    updatedAt: String
  }

  extend type Query {
    getAllDroneRentals: [DroneRental]
    getDroneRentalById(drone_rental_id: String!): DroneRental
    getDroneRentalsBySellerId(sellerId: String!): [DroneRental]
    getConfirmedDroneRentals: [DroneRental]
    getPendingDroneRentals: [DroneRental]
    getCancelledDroneRentals: [DroneRental]
  }

  extend type Mutation {
    createDroneRental(
      name: String!
      phone: String!
      location: String!
      rentalDate: String!
      rentalId: String!
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

    deleteDroneRental(drone_rental_id: String!): DroneRental

    updateDroneRentalStatus(
      drone_rental_id: String!
      status: String!
    ): DroneRental
  }
`;