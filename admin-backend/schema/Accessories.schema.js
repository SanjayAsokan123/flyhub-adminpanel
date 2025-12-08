import { gql } from "apollo-server-express";

export const accessoryTypeDefs = gql`
  type SellerInfo {
    email: String
    phoneNumber: String
  }

  type Accessory {
    accessoryId: String
    name: String!
    brand: String!
    category: String
    price: Float!
    description: String!
    image: String
    quantity: Int
    status: String!
    sellerId: String
    sellerInfo: SellerInfo
  }

  input AccessoryInput {
    name: String!
    brand: String!
    category: String
    price: Float!
    description: String!
    image: String
    quantity: Int
    sellerId: String!
  }

  extend type Query {
    accessories: [Accessory!]!

    accessory(accessoryId: String!): Accessory

    rejectedAccessories(sellerId: String!): [Accessory]

    approvedAccessories(sellerId: String!): [Accessory!]

    pendingAccessories(sellerId: String!): [Accessory!]
  }

  extend type Mutation {
    createAccessory(input: AccessoryInput!): Accessory

    updateAccessory(accessoryId: String!, input: AccessoryInput!): Accessory

    updateAccessoryStatus(accessoryId: String!, status: String!): Accessory

    deleteAccessory(accessoryId: String!): Accessory
  }
`;
