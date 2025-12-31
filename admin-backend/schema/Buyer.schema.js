// typeDefs/buyerTypeDefs.js
import { gql } from "apollo-server-express";

export const buyerTypeDefs = gql`
  scalar JSON
  scalar Date

  type Buyer {
    id: ID
    buyerId: String!
    firebaseUid: String
    name: String
    email: String
    phoneNumber: String
    token: String
    password: String
    createdAt: Date
    updatedAt: Date
    fcmTokens: [String]
    otp: String
    otpExpiresAt: Date
    welcomeNotificationSent: Boolean
  }

  type AuthPayload {
  buyer: Buyer!
  token: String!
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

  type ChangePasswordResponse {
    success: Boolean!
    message: String!
    buyerId: String
    email: String
  }

  type OtpResponse {
    success: Boolean!
    message: String!
    email: String
    expiresIn: String
  }

  type OtpVerificationResponse {
    success: Boolean!
    message: String!
    email: String
    expiresAt: Date
  }

  type DeleteAccountResponse {
  success: Boolean!
  message: String!
  buyerId: String
  email: String
  deletedAt: String
}

type DeleteAccountCompleteResponse {
  success: Boolean!
  message: String!
  buyerId: String
  email: String
  deletedAt: String
  deletedCounts: DeletedCounts
}

type DeletedCounts {
  buyers: Int
  notifications: Int
  orders: Int
  addresses: Int
  wishlist: Int
  other: Int
}

  extend type Query {
    buyers: [Buyer]
    buyer(buyerId: String!): Buyer
    buyerNotifications(buyerId: String!): [BuyerNotification]
    buyerByEmail(email: String, username: String, phoneNumber: String, buyerId: String): Buyer
    getBuyerByLoginKey(key: String!): Buyer
    verifyBuyerOtp(email: String!, otp: String!): OtpVerificationResponse!
  }

  extend type Mutation {
  sendBuyerWelcomeNotification(firebaseUid: String!): NotificationResponse!
   resendBuyerEmailVerification(firebaseUid: String!): NotificationResponse!
    signupBuyer(
      name: String!
      email: String!
      phoneNumber: String!
      password: String!
      firebaseUid: String
    ): Buyer

    loginBuyer(input: String!, password: String!): Buyer!
    loginBuyerGoogle(firebaseUid: String!): Buyer!

    updateBuyer(buyerId: ID!, input: BuyerInput!): Buyer!
    deleteBuyer(buyerId: ID!): String

    updateBuyerFcmToken(buyerId: String!, token: String!): UpdateTokenResponse
    markBuyerNotificationRead(notificationId: String!): NotificationResponse
    removeBuyerFcmToken(buyerId: String!, token: String!): UpdateTokenResponse
    
    deleteBuyerAccount(email: String!, password: String!): DeleteAccountResponse!

    deleteBuyerAccountWithFirebase(email: String!, firebaseUid: String!): DeleteAccountResponse!

    deleteBuyerAccountCompletely(email: String!, firebaseUid: String!): DeleteAccountCompleteResponse!

    changeBuyerPassword(
      email: String!, 
      newPassword: String!, 
      otp: String!
    ): ChangePasswordResponse!
    
    requestBuyerPasswordOtp(email: String!): OtpResponse!
    
    verifyBuyerOtp(email: String!, otp: String!): OtpVerificationResponse!
    
    testPush: BuyerNotification
  }

  extend type Subscription {
    buyerNotificationAdded(buyerId: String!): BuyerNotification
  }
`;