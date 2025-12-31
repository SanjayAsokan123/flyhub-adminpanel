import { gql } from "apollo-server-express";
export const cartTypeDefs = gql`
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

  
type Buyer
{
 firebaseUid: String
 buyerId:String
 name:String
 email: String
}

  type CartItem {
    id: ID!
    buyerId: String!
    productId: String!
    quantity: Int
    addedAt: Date
    product: Product   # ⭐ NEW FIELD
  }

  extend type Query {
    getCart(buyerId: String!): [CartItem]
    
    getBuyerfirebaseUidCart(firebaseUid: String!): Buyer
  }

  extend type Mutation {
    addToCart(buyerId: String!, productId: String!, quantity: Int): CartItem
    updateCartQty(buyerId: String!, productId: String!, quantity: Int): CartItem
    removeFromCart(buyerId: String!, productId: String!): Boolean
  }
`;
