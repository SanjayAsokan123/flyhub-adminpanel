import { gql } from "apollo-server-express";

export const partTypeDefs = gql`
  type SellerInfo {
    email: String
    phoneNumber: String
  }

  type Part {
    partId: String
    name: String!
    brand: String!
    price: Float!
    description: String!
    image: String
    quantity: Int!
    status: String!
    sellerId: String
    additionalInformation:String
    sellerInfo: SellerInfo
  }

input PartInput {
  name: String!
  brand: String!
  price: Float!
  description: String
  image: String
  quantity: Int
  sellerId: String!
  additionalInformation:String
  status: String
}
  type PartPage {
    items: [Part!]!
    totalCount: Int!
    page: Int!
    limit: Int!
    pageCount: Int!
  }
    input UpdatePartInput {
  name: String
  brand: String
  price: Float
  description: String
  image: String
  quantity: Int
  status: String
}

  type Query {
    parts: [Part!]
    part(id: ID!): Part
    rejectedParts(sellerId: String!): [Part!]
    approvedParts(sellerId: String!): [Part!]
    pendingParts(sellerId: String!): [Part!]
      approvedPartPaginated(page: Int!, limit: Int!): PartPage!
  }

  type Mutation {
    createPart(input: PartInput!): Part
    updatePart(partId: String!, input: UpdatePartInput!): Part
    updatePartStatus(partId: String!, status: String!): Part
    deletePart(partId: String!): Part
  }
`;
