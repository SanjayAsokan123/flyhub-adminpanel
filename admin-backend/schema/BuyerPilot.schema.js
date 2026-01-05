import { gql } from "apollo-server-express";

export const buyerPilotTypeDefs = gql`
  scalar JSON
  
  type PilotPaginatedResponse {
    items: [BuyerPilot]
    totalCount: Int
    pageCount: Int
    currentPage: Int
    hasNextPage: Boolean
  }

  type LocationResponse {
    locations: [String]
  }

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
    _id: ID!
    buyerPilotId: String!
    pilotName: String!
    pilotCompany: String
    location: String
    availability: Boolean!
    specification: String
    price: Price!
    profilePhoto: File
    certifications: [Certification!]!
    description: String
    newemail: String!
    newphoneNumber: String!
    adminStatus: String!
    buyerStatus: String!
    buyerId: String!
    buyer: Buyer
    createdAt: String!
    updatedAt: String!
    
    # For combined queries
    _source: String!
    displayId: String!
    contactEmail: String!
    contactPhone: String!
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
    getApprovedPilots: [BuyerPilot]
    
    getApprovedPilotsPaginated(
      page: Int!
      limit: Int!
      query: String
      search: JSON
    ): PilotPaginatedResponse
    
    getApprovedPilotById(buyerPilotId: String!): BuyerPilot
    
    getApprovedPilotLocations: LocationResponse
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