import { gql } from "apollo-server-express";

export const orderTypeDefs = gql`
  type Buyer {
    buyerId: String
    name: String
    email: String
    phone: String
    address: String
    sellerId: String
  }

  type Item {
    productId: String
    type: String
    name: String
    price: Float
    quantity: Int
    sellerId: String
  }

  type Payment {
    method: String
    status: String
  }

  type Order {
    orderId: String
    buyer: Buyer
    items: [Item]
    totalAmount: Float
    status: String
    payment: Payment
    createdAt: String
  }

  input BuyerInput {
    buyerId: String!
    name: String
    email: String
    phone: String
    address: String
  }

  input ItemInput {
    productId: String
    type: String
    quantity: Int
  }

  input PaymentInput {
    method: String
    status: String
  }

  extend type Query {
    """Fetch all orders"""
    orders: [Order]

    """Fetch specific order by ID"""
    order(orderId: String!): Order   # ✅ Added this
  }

  extend type Mutation {
    """Create a new order"""
    createOrder(
      buyerData: BuyerInput!
      items: [ItemInput!]!
      paymentData: PaymentInput!
    ): Order

    """Update buyer info"""
    updateOrder(orderId: String!, address: String, phone: String): Order

    """Delete an order"""
    deleteOrder(orderId: String!): Order
  }
`;