import { gql } from "apollo-server-express";

export const orderTypeDefs = gql`

  type Item {
    productId: String
    type: String
    name: String
    price: Float
    quantity: Int
    sellerId: String
  }

  type BuyerInfo {
    buyerId: String
    name: String
    email: String
    phone: String
    address: String
  }

  type Payment {
    method: String
    status: String
    transactionId: String
    isOnlinePayment: Boolean
  }

  input PaymentInput {
    method: String!
    status: String!
    transactionId: String
    isOnlinePayment: Boolean!
  }

  type Order {
    orderId: String
    buyer: BuyerInfo
    items: [Item]
    totalAmount: Float
    status: String
    payment: Payment
    connectionStatus: String
    createdAt: String
  }

  input BuyerInput {
    buyerId: String!
    name: String!
    email: String!
    phone: String!
    address: String!
  }

  input ItemInput {
    productId: String!
    type: String!
    quantity: Int!
  }

  type FailedPaymentLog {
    id: String
    timestamp: String
    status: String
  }

  extend type Query {
    orders: [Order]

    order(orderId: String!): Order

    getBuyerfirebaseUidInOrder(firebaseUid: String!): Buyer

    ordersByBuyer(buyerId: String!): [Order]
  }

  extend type Mutation {
    createOrder(
      buyerData: BuyerInput!
      items: [ItemInput!]!
      paymentData: PaymentInput!
      connectionStatus: String!
    ): Order

    createRazorpayOrder(amount: Int!): String

    verifyRazorpayPayment(
      razorpay_order_id: String!
      razorpay_payment_id: String!
      razorpay_signature: String!
      buyerId: String!
    ): Boolean

    logFailedPayment(
      paymentId: String
      razorpayOrderId: String
      reason: String!
      amount: Float!
      connectionStatus: String!
    ): FailedPaymentLog

    updateOrderStatus(orderId: String!, status: String!): Order   

    cancelOrder(orderId: String!, buyerId: String!): Order        

    deleteOrder(orderId: String!): Order
  }

`;