import { gql } from "apollo-server-express";

export const accessoryTypeDefs = gql`
  type SellerInfo {
    email: String
    phoneNumber: String
  }
input UpdateAccessoryInput {
  name: String
  brand: String
  category: String
  price: Float
  description: String
  image: String
  quantity: Int
  status: String
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

    type AccessoryPage {
    items: [Accessory!]!
    totalCount: Int!
    page: Int!
    limit: Int!
    pageCount: Int!
  }

  extend type Query {
    accessories: [Accessory!]!

    accessory(accessoryId: String!): Accessory

    rejectedAccessories(sellerId: String!): [Accessory]

    approvedAccessories(sellerId: String!): [Accessory!]

    pendingAccessories(sellerId: String!): [Accessory!]

    approvedAccessoriesPaginated(page: Int!, limit: Int!): AccessoryPage!
  }

  extend type Mutation {
    createAccessory(input: AccessoryInput!): Accessory

    updateAccessory(accessoryId: String!, input: UpdateAccessoryInput!): Accessory

    updateAccessoryStatus(accessoryId: String!, status: String!): Accessory

    deleteAccessory(accessoryId: String!): Accessory
  }
`;
