// typeDefs/buyerTypeDefs.js
import { gql } from "apollo-server-express";

export const buyerTypeDefs = gql`
  scalar JSON
  scalar Date

  type Buyer {
    id: ID
    buyerId: String
    firebaseUid: String
    name: String
    email: String
    phoneNumber: String
    token: String
    password: String
    createdAt: Date
    updatedAt: Date
    fcmTokens: [String]
  }

  input BuyerInput {
    name: String
    email: String
    phoneNumber: String
    firebaseUid: String
    password: String
  }

  type BuyerNotification {
    notificationId: String!
    buyerId: String!
    title: String!
    message: String!
    type: String
    url: String
    data: JSON
    read: Boolean!
    createdAt: Date!
  }

  type NotificationResponse {
    success: Boolean!
    message: String
  }

  type UpdateTokenResponse {
    success: Boolean!
    message: String!
    buyer: Buyer
  }

  extend type Query {
    buyers: [Buyer]
    buyer(buyerId: ID!): Buyer
    buyerNotifications(buyerId: String!): [BuyerNotification]
    buyerByEmail(email: String, username: String, phoneNumber: String, buyerId: String): Buyer
    getBuyerByLoginKey(key: String!): Buyer
  }

  extend type Mutation {
    signupBuyer(
      name: String!
      email: String!
      phoneNumber: String!
      password: String!
      firebaseUid: String!
    ): Buyer

    loginBuyer(input: String!, password: String!): Buyer!
    loginBuyerGoogle(firebaseUid: String!, email: String!): Buyer!

    updateBuyer(buyerId: ID!, input: BuyerInput!): Buyer!
    deleteBuyer(buyerId: ID!): String

    updateBuyerFcmToken(buyerId: String!, token: String!): UpdateTokenResponse
    markBuyerNotificationRead(notificationId: String!): NotificationResponse

    testPush: BuyerNotification
  }

  extend type Subscription {
    buyerNotificationAdded(buyerId: String!): BuyerNotification
  }
`;
