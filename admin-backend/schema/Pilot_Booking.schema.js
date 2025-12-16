import { gql } from "apollo-server-express";

export const pilotBookingTypeDefs = gql`
  scalar Date
  type PilotBooking {
    id: ID!
    bookingId: String!
    pilotId: String!
    pilotName: String
    pilotCompany: String

    buyerId: String
    buyerName: String!
    buyerEmail: String
    contact: String!

    location: String!
    date: String!
    startTime: String!
    endTime: String!

    status: String!

    createdAt: Date
    updatedAt: Date
  }

  input BookPilotInput {
    pilotId: String!
    buyerId: String
    buyerEmail: String
    buyerName: String!
    contact: String!
    location: String!
    date: String!
    startTime: String!
    endTime: String!
  }

  type DeleteResponse {
  success: Boolean!
  message: String!
}


  type BookPilotResponse {
    success: Boolean!
    message: String!
    booking: PilotBooking
  }

  extend type Query {
    getBuyerPendingPilotBookings(buyerId: String!): [PilotBooking!]!
    getBuyerApprovedPilotBookings(buyerId: String!): [PilotBooking!]!
    getBuyerRejectedPilotBookings(buyerId: String!): [PilotBooking!]!
    getBuyerCompletedPilotBookings(buyerId: String!): [PilotBooking!]!

    getSellerPendingPilotBookings(sellerId: String!): [PilotBooking!]!
    getSellerApprovedPilotBookings(sellerId: String!): [PilotBooking!]!
    getSellerRejectedPilotBookings(sellerId: String!): [PilotBooking!]!
    getSellerCompletedPilotBookings(sellerId: String!): [PilotBooking!]!
   

    getAllPilotBookings: [PilotBooking!]!
  }

  type BookingStats {
    total: Int!
    pending: Int!
    approved: Int!
    rejected: Int!
    completed: Int!
  }

  extend type Mutation {
    bookPilot(input: BookPilotInput!): BookPilotResponse!

    updatePilotBookingStatus(bookingId: String!, status: String!): PilotBooking!
    deletePilotBookingByBuyer(
  bookingId: String!
  buyerId: String!
): DeleteResponse!

  }

  extend type Subscription {
    newPilotBooking: PilotBooking
  }
`;