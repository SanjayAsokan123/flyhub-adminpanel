import { gql } from "apollo-server-express";

export const rentalTypeDefs = gql`
  type SellerInfo {
    email: String
    phoneNumber: String
  }
type PaginatedRentals {
  items: [Rental!]!
  totalCount: Int!
  page: Int!
  limit: Int!
  pageCount: Int!
}
type Rental {
  rentalId: String!
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

  type Query {
    rentals: [Rental!]
    rental(rentalId: String!): Rental
    rejectedRentals(sellerId: String!): [Rental!]
        approvedRentals(sellerId: String!): [Rental!]
        pendingRentals(sellerId: String!): [Rental!]
    approvedRentalsPaginated(page: Int!, limit: Int!): PaginatedRentals!
  }

  type Mutation {
    createRental(input: RentalInput!): Rental
    updateRentalStatus(rentalId: String!, status: String!): Rental
    updateRental(rentalId: String!, input: RentalInput!): Rental
    deleteRental(rentalId: String!): Rental
  }
`;