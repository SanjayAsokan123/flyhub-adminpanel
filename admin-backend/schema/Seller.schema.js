// backend/typeDefs/sellerTypeDefs.js
import { gql } from "apollo-server-express";

export const sellerTypeDefs = gql`
  """
  🧾 Seller Type
  Represents a registered or pending seller in FlyHub.
  Linked to Firebase UID + customId.
  """
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

    # Multi-device FCM notification tokens
    fcmTokens: [String!]

    # (Deprecated) Latest device token for backward compatibility
    fcmToken: String

    # Linked drones
    Drones: [Drone!]
  }

  """
  🔄 Seller account status enum
  Mirrors the Mongoose model (pending, approved, rejected, suspended)
  """
  enum SellerStatus {
    pending
    approved
    rejected
    suspended
  }

  """
  ✏ Seller Input (Registration / Update)
  Fields optional to allow partial updates and Firebase-first onboarding.
  """
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

  """
  📱 FCM Token Update Response
  Returned when user installs new app / logs in / changes device.
  """
  type UpdateTokenResponse {
    success: Boolean!
    message: String!
    seller: Seller
  }

  """
  🔍 Query Definitions
  """
  type Query {
    # Get sellers filtered by status (pending / approved / ...)
    getSellersByStatus(status: SellerStatus!): [Seller!]!

    # Get all sellers
    getSellers: [Seller!]!

    # Get one seller by customId
    getSeller(customId: ID!): Seller

    """
    Firebase/Auth unified lookup:
    - email
    - username (future use)
    - phone
    - customId

    Can auto-create a minimal pending seller if not found.
    """
    sellerByEmail(
      email: String
      username: String
      phone: String
      customId: String
    ): Seller
  }

  """
  🔧 Mutation Definitions
  """
  type Mutation {
    # 🟢 Create seller
    createSeller(input: SellerInput!): Seller!

    # ✏ Update seller details
    updateSeller(customId: ID!, input: SellerInput!): Seller

    # 🔄 Change seller status (pending → approved → rejected)
    changeSellerStatus(customId: ID!, status: SellerStatus!): Seller!

    # 🗑 Delete seller
    deleteSeller(customId: ID!): Seller

    # 📲 Add or update FCM token for multi-device login
    updateSellerFcmToken(firebaseUid: String!, fcmTokens: String!): UpdateTokenResponse!
  }
`;