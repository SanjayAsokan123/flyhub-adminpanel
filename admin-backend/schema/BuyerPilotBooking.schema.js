import { gql } from "apollo-server-express";

export const buyerPilotBookingTypeDefs = gql`
  scalar Date

  type BuyerPilotBooking {
    buyerPilotBookingId: String!
    buyerPilotId: String!
    contact: String!
    location: String
    date: String!
    startTime: String!
    endTime: String!
    status: String!

    buyerId: String
    buyerName: String
    buyerEmail: String
    buyerPhone: String

    createdAt: Date
    updatedAt: Date
  }

  input BookBuyerPilotInput {
    buyerPilotId: String!
    buyerId: String!
    contact: String!
    location: String!
    date: String!
    startTime: String!
    endTime: String!
  }

  type BookBuyerPilotResponse {
    success: Boolean!
    message: String!
    booking: BuyerPilotBooking
  }

  extend type Query {
    getBuyerPilotBookings(buyerId: String!): [BuyerPilotBooking!]!
    getAllBuyerPilotBookings: [BuyerPilotBooking!]!
  }

  extend type Mutation {
    bookBuyerPilot(input: BookBuyerPilotInput!): BookBuyerPilotResponse!

    updateBuyerPilotBookingStatus(
      buyerPilotBookingId: String!
      status: String!
    ): BuyerPilotBooking!

    deleteBuyerPilotBooking(
      buyerPilotBookingId: String!
      buyerId: String!
    ): Boolean!
  }
`;
