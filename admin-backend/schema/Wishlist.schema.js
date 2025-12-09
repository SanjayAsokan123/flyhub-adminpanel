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

  type Buyer {
    firebaseUid: String
    buyerId: String
    name: String
    email: String
  }

  type WishlistItem {
    id: ID!
    buyerId: String!
    productId: String!
    addedAt: Date
    product: Product
  }

  extend type Query {
    getProduct(productId: String!): Product
    getWishlist(buyerId: String!): [WishlistItem]
    getBuyerfirebaseUidWish(firebaseUid: String!): Buyer
  }

  extend type Mutation {
    addToWishlist(buyerId: String!, productId: String!): WishlistItem
    removeFromWishlist(buyerId: String!, productId: String!): Boolean
  }
`;
