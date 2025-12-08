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

type Payment {
  method: String
  status: String
  transactionId: String
}

input PaymentInput {
  method: String
  status: String
  transactionId: String
}


  extend type Query {
    orders: [Order]

    order(orderId: String!): Order
  }

  extend type Mutation {
    createOrder(
      buyerData: BuyerInput!
      items: [ItemInput!]!
      paymentData: PaymentInput!
    ): Order

    createRazorpayOrder(amount: Int!): String
   verifyRazorpayPayment(
    razorpay_order_id: String!
    razorpay_payment_id: String!
    razorpay_signature: String!
  ): Boolean

    updateOrder(orderId: String!, address: String, phone: String): Order

    deleteOrder(orderId: String!): Order
  }
`;