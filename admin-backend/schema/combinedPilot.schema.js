// combinedPilotTypeDefs.js
import { gql } from "apollo-server-express";

export const combinedPilotTypeDefs = gql`
  type CombinedPilot {
    _id: ID!
    pilotId: String!
    pilotName: String!
    pilotCompany: String
    location: String
    availability: Boolean!
    specification: String
    price: Price!
    description: String
    adminStatus: String!
    buyerStatus: String
    
    # Source-specific fields
    source: String! # "seller" or "buyer"
    displayId: String!
    contactPerson: String
    contactEmail: String!
    contactPhone: String!
    
    # Seller-specific (nullable for buyer pilots)
    certifications: [Certification]
    resume: File
    
    # Buyer-specific (nullable for seller pilots)
    profilePhoto: File
    
    # Additional info
    createdAt: String
    updatedAt: String
    
    # For compatibility with existing code
    newemail: String
    newphoneNumber: String
  }

  type CombinedPilotPage {
    items: [CombinedPilot!]!
    totalCount: Int!
    page: Int!
    limit: Int!
    pageCount: Int!
  }

  type PilotCounts {
    total: Int!
    sellerCount: Int!
    buyerCount: Int!
  }

  input CombinedPilotSearchInput {
    location: String
    minPricePerHour: Float
    maxPricePerHour: Float
    minPricePerDay: Float
    maxPricePerDay: Float
    sortBy: String # "price_low_high", "price_high_low", "name_asc", "name_desc", "newest"
  }

  extend type Query {
    getAllApprovedPilotsPaginated(
      page: Int!
      limit: Int!
      query: String
      search: CombinedPilotSearchInput
    ): CombinedPilotPage!
    
    getApprovedPilotsCount: PilotCounts!
  }
`;