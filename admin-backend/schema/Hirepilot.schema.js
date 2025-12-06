import { gql } from "apollo-server-express";

export const hirePilotTypeDefs = gql`
  type Price {
    perHour: Float
    perDay: Float
  }

  type Certification {
    url: String!
    filename: String
    uploadedAt: String
  }

  type File {
    url: String!
    filename: String
    uploadedAt: String
  }

  type HirePilot {
    pilotId: String
    pilotName: String
    pilotCompany: String
    location: String
    sellerId: ID
    availability: Boolean
    specification: String
    price: Price
    certifications: [Certification!]!
    resume: File!
    description: String
    email: String
    phoneNumber: String
    adminStatus: String
    buyerStatus: String
    seller: Seller
  }

  input PriceInput {
    perHour: Float!
    perDay: Float!
  }

  input CertificationInput {
    url: String!
    filename: String
  }

  input FileInput {
    url: String!
    filename: String
  }

  input HirePilotInput {
    pilotId: String
    pilotName: String!
    pilotCompany: String!
    location: String!
    newemail: String!
    newphoneNumber: String!
    sellerId: ID!
    availability: Boolean!
    specification: String!
    price: PriceInput!
    certifications: [CertificationInput!]!
    resume: FileInput!
    description: String
  }


  type BookPilotResponse {
    success: Boolean!
    message: String!
    booking: PilotBooking
  }

  type NewPilotBooking {
    bookingId: ID!
    pilotId: String!
    buyerName: String!
    date: String!
    startTime: String!
    endTime: String!
  }

  type HirePilotStatusChange {
    pilotId: String!
    pilotName: String!
    adminStatus: String!
    sellerId: ID!
  }



  extend type Query {
    hirePilots: [HirePilot]

    hirePilot(pilotId: String!): HirePilot

    hirePilotsBySeller(sellerId: String!): [HirePilot]

    hirePilotsByStatus(adminStatus: String!): [HirePilot]

    approvedHirePilotsByStatus: [HirePilot]

  }

  extend type Mutation {
    addHirePilot(input: HirePilotInput!): HirePilot!

    updateHirePilot(pilotId: String!, input: HirePilotInput!): HirePilot!


    adminUpdateHirePilotStatus(pilotId: String!, adminStatus: String!): HirePilot!

    buyerUpdateHirePilotStatus(pilotId: String!, buyerStatus: String!): HirePilot!

    deleteHirePilot(pilotId: String!): HirePilot!
  }
  extend type Subscription {
    hirePilotStatusChanged: HirePilotStatusChange
  }

`;
