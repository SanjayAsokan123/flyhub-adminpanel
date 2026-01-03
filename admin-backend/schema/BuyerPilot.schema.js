import { gql } from "apollo-server-express";

export const buyerPilotTypeDefs = gql`
  type Buyer {
  buyerId: String
  name: String
  email: String
  phoneNumber: String
}

type Price {
  perHour: Float
  perDay: Float
}

type Certification {
  url: String!
}

type File {
  url: String!
}

type BuyerPilot {
  buyerPilotId: String
  pilotName: String
  pilotCompany: String
  location: String
  availability: Boolean
  specification: String
  price: Price
  profilePhoto: File
  certifications: [Certification!]!
  description: String
  newemail: String
  newphoneNumber: String
  adminStatus: String
  buyerStatus: String
  buyerId: String
  buyer: Buyer
}

input PriceInput {
  perHour: Float!
  perDay: Float!
}

input CertificationInput {
  url: String!
}

input FileInput {
  url: String!
}

input BuyerPilotInput {
  pilotName: String!
  pilotCompany: String
  location: String
  availability: Boolean!
  specification: String
  price: PriceInput!
  profilePhoto: FileInput
  certifications: [CertificationInput!]!
  description: String
  newemail: String!
  newphoneNumber: String!
  buyerId: ID!
}

extend type Query {
  buyerPilots: [BuyerPilot]
  buyerPilot(buyerPilotId: String!): BuyerPilot
  buyerPilotsByBuyer(buyerId: String!): [BuyerPilot]
}

extend type Mutation {
  addBuyerPilot(input: BuyerPilotInput!): BuyerPilot!
  adminUpdateBuyerPilotStatus(
    buyerPilotId: String!
    adminStatus: String!
  ): BuyerPilot!
  buyerUpdateBuyerPilotStatus(
    buyerPilotId: String!
    buyerStatus: String!
  ): BuyerPilot!
  deleteBuyerPilot(buyerPilotId: String!): Boolean!
}
`;
