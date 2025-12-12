import { gql } from "apollo-server-express";

export const rentalTypeDefs = gql`
  type SellerInfo {
    email: String
    phoneNumber: String
  }

  type Rental {
    rentalId: ID!
    name: String!
    brand: String
    location: String
    pricePerHour: Float
    pricePerDay: Float
    description: String
    image: String
    quantity: Int
    insurance: Boolean
    with_pilot: Boolean
    available_today: Boolean
    status: String!
    sellerId: String
    sellerInfo: SellerInfo
  }

  input RentalInput {
    name: String!
    brand: String
    location: String
    pricePerHour: Float!
    pricePerDay: Float!
    description: String
    image: String
    quantity: Int
    sellerId: String!
  }

  input RentalSearchInput {
    brand: String
    location: String
    minPricePerHour: Float
    maxPricePerHour: Float
    minPricePerDay: Float
    maxPricePerDay: Float
  }

  type PaginatedRentals {
    items: [Rental!]!
    totalCount: Int!
    page: Int!
    limit: Int!
    pageCount: Int!
  }

  type Query {
    rentals: [Rental!]
    rental(rentalId: ID!): Rental
    rejectedRentals(sellerId: String!): [Rental!]
    approvedRentals(sellerId: String!): [Rental!]
    pendingRentals(sellerId: String!): [Rental!]
    approvedRentalsPaginated(
      page: Int!
      limit: Int!
      search: RentalSearchInput
    ): PaginatedRentals!
  }

  type Mutation {
    createRental(input: RentalInput!): Rental
    updateRentalStatus(rentalId: ID!, status: String!): Rental
    updateRental(rentalId: ID!, input: RentalInput!): Rental
    deleteRental(rentalId: ID!): Rental
  }
`;
