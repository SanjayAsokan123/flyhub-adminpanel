import { gql } from "apollo-server-express";

export const cartTypeDefs = gql`
  scalar Date

  type CartItem {
    id: ID!
    buyerId: String!
    productId: String!
    quantity: Int!
    addedAt: Date
  }

  extend type Query {
    getCart(buyerId: String!): [CartItem]
  }

  extend type Mutation {
    addToCart(buyerId: String!, productId: String!): CartItem
    updateCartQty(buyerId: String!, productId: String!, quantity: Int!): CartItem
    removeFromCart(buyerId: String!, productId: String!): Boolean
  }
`;
