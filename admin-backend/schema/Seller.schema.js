import { gql } from "apollo-server-express";

export const sellerTypeDefs = gql`
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

    Drones: [Drone!]
  }

  enum SellerStatus {
    pending
    approved
    rejected
    suspended
    deactivated
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

  type UpdateTokenResponse {
    success: Boolean!
    message: String!
    seller: Seller
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
  }

  type Mutation {
    createSeller(input: SellerInput!): Seller!
    changeSellerStatus(customId: ID!, status: SellerStatus!): Seller!
    deleteSeller(customId: ID!): Seller
    updateSeller(customId: String!, input: SellerInput!): Seller
    updateSellerFcmToken(customId: String!, fcmToken: String!): UpdateTokenResponse!
    removeSellerFcmToken(customId: String!, fcmToken: String!): UpdateTokenResponse!
    deactivateSeller(customId: ID!, reason: String!): Seller!
    activateSeller(customId: ID!): Seller!
    changeSellerPassword(customId: ID!, newPassword: String!): Seller!
  }
`;