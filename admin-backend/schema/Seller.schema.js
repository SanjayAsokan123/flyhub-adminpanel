import { gql } from "apollo-server-express";

export const sellerTypeDefs = gql`
  scalar JSON
  scalar Date

  type Seller {
    customId: ID
    firebaseUid: String
    name: String
    companyName: String
    PANnumber: String
    gstNumber: String
    address: String
    bankIFCnumber: String
    bankAccountNumber: String
    authorized: String
    email: String
    phoneNumber: String
    status: SellerStatus
    shippingAddresses: [String!]
    pickupAddresses: [String!]
    companyPan: String
    bankName: String
    fcmTokens: [String!]
    fcmToken: String
    otp: String
    otpExpiresAt: Date
    otpVerified: Boolean
    createdAt: Date
    updatedAt: Date
    deactivatedAt: Date
    deactivatedReason: String
  }

  enum SellerStatus {
    pending
    approved
    rejected
    suspended
    deactivated
  }

    type OtpResponse {
    success: Boolean!
    message: String!
    seller: Seller
  }

  type PasswordChangeResponse {
    success: Boolean!
    message: String!
    seller: Seller
  }

  type SellerNotification {
    notificationId: String!
    sellerId: String!
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

  type OtpVerificationResponse {
    success: Boolean!
    message: String!
    email: String
    expiresAt: Date
  }
  
  type DeactivationResponse {
    success: Boolean!
    message: String!
    seller: Seller
  }
  
  type DeleteSellerResponse {
    customId: String
    email: String
    phoneNumber: String
    firebaseUid: String
    companyName: String
    deletedAt: Date
    message: String
  }

  input SellerInput {
    name: String
    companyName: String
    PANnumber: String
    gstNumber: String
    address: String
    bankIFCnumber: String
    bankAccountNumber: String
    authorized: String
    email: String
    phoneNumber: String
    shippingAddresses: [String!]
    pickupAddresses: [String!]
    companyPan: String
    bankName: String
    firebaseUid: String
    status: SellerStatus
    fcmToken: String
  }

input SellerProfileInput {
  name: String
  companyName: String
  PANnumber: String
  gstNumber: String
  address: String
  bankIFCnumber: String
  bankAccountNumber: String
  companyPan: String
  bankName: String
  pickupAddresses: [String!]
  shippingAddresses: [String!]
}


  type UpdateTokenResponse {
    success: Boolean!
    message: String!
    seller: Seller
  }

    type Drone {
    id: ID
    name: String
    model: String
    status: String
    sellerId: String
  }

  type Query {
    getSellersByStatus(status: SellerStatus!): [Seller!]!
    getSellers: [Seller!]!
    getSeller(customId: ID!): Seller

    sellerByEmail(
      email: String
      username: String
      phone: String
      customId: String
    ): Seller

    verifySellerOtp(email: String!, otp: String!): OtpVerificationResponse!
    sellerNotifications(sellerId: String!): [SellerNotification]
  }

  type Mutation {
    createSeller(input: SellerInput!): Seller!
    changeSellerStatus(customId: ID!, status: SellerStatus!): Seller!
    deleteSeller(customId: ID!): Seller
    updateSellerProfile(customId: String!, input: SellerProfileInput!): Seller
    
    updateSellerFcmToken(customId: String!, fcmToken: String!): UpdateTokenResponse!
    removeSellerFcmToken(customId: String!, fcmToken: String!): UpdateTokenResponse!
    deactivateSeller(customId: ID!, reason: String!): Seller!
    requestSellerPasswordOtp(email: String!): OtpResponse!
    activateSeller(customId: String! , email:String , otp:String): Seller!
    deactivateSellerAccount(reason: String!): DeactivationResponse!
    verifySellerPasswordOtp(email: String!, otp: String!): OtpResponse!
    changeSellerPassword(email: String!, newPassword: String!): PasswordChangeResponse!

    markSellerNotificationRead(notificationId: String!): NotificationResponse
  }
      type Subscription {
    sellerNotificationAdded(sellerId: String!): SellerNotification
  }
`;