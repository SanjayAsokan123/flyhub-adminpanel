import { gql } from "apollo-server-express";

export const wishlistTypeDefs = gql`
  scalar Date

  type Product {
    productId: String!
    name: String!
    brand: String
    price: Float!
    image: String
    description: String
    category: String!
    status: String
  }

  type WishlistItem {
    id: ID!
    buyerId: String!
    productId: String!
    addedAt: Date
    product: Product   # ⭐ MUST BE ADDED
  }

  extend type Query {
    getProduct(productId: String!): Product
    getWishlist(buyerId: String!): [WishlistItem]
  }

  extend type Mutation {
    addToWishlist(buyerId: String!, productId: String!): WishlistItem
    removeFromWishlist(buyerId: String!, productId: String!): Boolean
  }
`;
