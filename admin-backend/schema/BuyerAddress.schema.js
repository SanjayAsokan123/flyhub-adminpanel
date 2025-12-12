import { gql } from "apollo-server-express";

export const addressTypeDefs = gql`

  type Address {
    _id: ID!
    addressId: String!
    buyerId: String!
    firstName: String!
    lastName: String!
    streetAddress: String!
    city: String!
    state: String!
    zipCode: String!
    phone: String!
    createdAt: String
    updatedAt: String
  }

  input CreateAddressInput {
    buyerId: String!
    firstName: String!
    lastName: String!
    streetAddress: String!
    city: String!
    state: String!
    zipCode: String!
    phone: String!
  }

  type Buyer {
    id: ID!
    buyerId: String!
    name: String!
    email: String
    phone: String
    addresses: [Address]
  }


  input UpdateAddressInput {
    firstName: String
    lastName: String
    streetAddress: String
    city: String
    state: String
    zipCode: String
    phone: String
  }

  type Query {
    getAddressesByBuyer(buyerId: String!): [Address]
    getAddressById(addressId: String!): Address
    getAllBuyers: [Buyer]
  }

  type Mutation {
    createAddress(input: CreateAddressInput!): Address
    updateAddress(addressId: String!, input: UpdateAddressInput!): Address
    deleteAddress(addressId: String!): Boolean
  }
`;