import { gql } from "apollo-server-express";

export const sellerTypeDefs = gql`
  scalar JSON

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
  }

  enum SellerStatus {
    pending
    approved
    rejected
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
 firebaseUid:String
 status: SellerStatus
 fcmToken: String
}

  type UpdateTokenResponse {
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
    createdAt: String!
  }

  type NotificationResponse {
    success: Boolean!
    message: String
  }
  type Query {
    getSellersByStatus(status: SellerStatus!): [Seller!]!
    getSellers: [Seller!]!
    getSeller(customId: ID!): Seller

     sellerNotifications(sellerId: String!): [SellerNotification]

    sellerByEmail(
      email: String
      username: String
      phone: String
      customId: String
    ): Seller

    getSellerByLoginKey(key: String!): Seller
  }

  type Mutation {
    createSeller(input: SellerInput!): Seller!

    updateSeller(customId: ID!, input: SellerInput!): Seller!

    changeSellerStatus(customId: ID!, status: SellerStatus!): Seller!

    deleteSeller(customId: ID!): Seller

    markSellerNotificationRead(notificationId: String!): NotificationResponse

    updateSellerFcmToken(customId: String!, token: String!): UpdateTokenResponse!
  }

extend type Subscription {
  sellerNotificationAdded(sellerId: String!): SellerNotification
}

`;