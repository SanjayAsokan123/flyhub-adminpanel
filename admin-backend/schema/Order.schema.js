import { gql } from "apollo-server-express";

export const orderTypeDefs = gql`
  scalar Date
  scalar JSON

  type Item {
  productId: String!
  type: String!
  name: String!
  price: Float!
  quantity: Int!
  sellerId: String!
  image: String!
  status: String
  rejectReason: String
  cancelReason: String
}


  type BuyerInfo {
  buyerId: String!
  name: String!
  email: String
  phone: String
  address: String
}


  type Payment {
    mode: String
    method: String
    status: String
    transactionId: String
  }

  input PaymentInput {
    mode: String!
    method: String
    status: String
    transactionId: String
  }

 type Order {
  orderId: String!
  buyer: BuyerInfo!
  items: [Item!]!
  totalAmount: Float!
  status: String!
  createdAt: Date
  updatedAt: Date

  invoiceUrl: String
  invoiceNo: String
  trackingNumber: String
  trackingProvider: String
  payoutStatus: String
  sellerPackingSlips: JSON
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

  type StockUpdate {
    productId: String!
    type: String!
    quantity: Int!
  }

  extend type Query {
    orders: [Order]
    order(orderId: String!): Order
    ordersByBuyer(buyerId: String!): [Order]
    getBuyerfirebaseUidInOrder(firebaseUid: String!): Buyer
  }

  extend type Mutation {
    createOrder(
      buyerData: BuyerInput!
      items: [ItemInput!]!
      paymentData: PaymentInput!
    ): Order

    cancelOrder(
      orderId: String!
      buyerId: String!
      reason: String!
    ): Order

    generateSellerPackingSlip(
      orderId: String!
      sellerId: String!
    ): String

    createRazorpayOrder(amount: Int!): String

    verifyRazorpayPayment(
      razorpay_order_id: String!
      razorpay_payment_id: String!
      razorpay_signature: String!
      buyerId: String!
    ): Boolean

    updateOrderStatus(
      orderId: String!
      status: String!
      trackingNumber: String
    ): Order

    rejectOrderBySeller(
      orderId: String!
      sellerId: String!
      reason: String!
    ): Order

    confirmOrderDelivery(
      orderId: String!
      buyerId: String!
    ): Order

    deleteOrder(orderId: String!): Order
  }

  extend type Subscription {
    stockUpdated: StockUpdate!
    orderCancelled: Order!
  }
`;
