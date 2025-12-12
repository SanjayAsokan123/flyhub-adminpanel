import { gql } from "apollo-server-express";

export const rentalBookingTypeDefs = gql`
  type RentalPeriod {
    startDate: String!
    endDate: String!
  }

  type PilotLight {
    pilotId: String
    pilotName: String
    phoneNumber: String
    email: String
    pilotCompany: String
  }

  type PilotRental {
    pilot_rental_id: String!
    name: String!
    email: String!
    phone: String!
    location: String!
    amount: Float!
    status: String!
    rentalDate: String!
    rentalPeriod: RentalPeriod!
    paymentStatus: String!
    createdAt: String!
    updatedAt: String!
    pilot: PilotLight
  }

  input RentalPeriodInput {
    startDate: String!
    endDate: String!
  }

type Query {
  getAllPilotRentals: [PilotRental!]!
  getPilotRentalsBySellerId(sellerId: String!): [PilotRental]
  getPilotRentalsByStatus(status: String!): [PilotRental!]!
  getPilotRentalsByPaymentStatus(paymentStatus: String!): [PilotRental!]!
  getPilotRentalById(pilot_rental_id: String!): PilotRental
  getPendingRentals: [PilotRental!]!
  getConfirmedRentals: [PilotRental!]!
  getCancelledRentals: [PilotRental!]!
  getCompletedPaymentRentals: [PilotRental!]!
}

  type Mutation {
    createPilotRental(
      name: String!
      email: String!
      phone: String!
      location: String!
      amount: Float!
      rentalDate: String!
      rentalPeriod: RentalPeriodInput!
      pilotId: String!
    ): PilotRental!

    updatePilotRentalContact(
      pilot_rental_id: String!
      phone: String
      location: String
    ): PilotRental!

    updatePilotRentalStatus(
      pilot_rental_id: String!
      status: String!
    ): PilotRental!

    updatePaymentStatus(
      pilot_rental_id: String!
      paymentStatus: String!
    ): PilotRental!

    deletePilotRental(pilot_rental_id: String!): PilotRental!
  }
`;