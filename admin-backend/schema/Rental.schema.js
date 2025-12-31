import { gql } from "apollo-server-express";

export const rentalTypeDefs = gql`
  type SellerInfo {
    email: String
    phoneNumber: String
  }

  type Rental {
    rentalId:String!
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

  input UpdateRentalInput {
  name: String
  brand: String
  location: String
  pricePerHour: Float
  pricePerDay: Float
  description: String
  image: String
  quantity: Int
}
  type Query {
    rentals: [Rental!]
    rental(rentalId: String!): Rental
    rejectedRentals(sellerId: String!): [Rental!]
    approvedRentals(sellerId: String!): [Rental!]
    pendingRentals(sellerId: String!): [Rental!]
   approvedRentalsPaginated(
      page: Int!
      limit: Int!
      search: RentalSearchInput
      query: String
    ): PaginatedRentals!
  }

  type Mutation {
    createRental(input: RentalInput!): Rental
    updateRentalStatus(rentalId: String!, status: String!): Rental
    updateRental(rentalId: String!, input: UpdateRentalInput!): Rental
    deleteRental(rentalId: String!): Rental
  }
`;