



import { gql } from "apollo-server-express";

export const ServiceBookingTypeDefs = gql`
  scalar Date

  # ==============================
  #   CONTACT TYPE
  # ==============================
  type Contact {
    id: ID!                 # <-- Now correctly supported
    name: String!
    email: String!
    location: String!
    date: String
    information: String!
    status: String!
    phone: String
    sellerId: String
    serviceId: String
    serviceBookingId: String
    buyerId: String
    createdAt: Date
    updatedAt: Date
  }

  # ==============================
  #   PAGINATION RESPONSE
  # ==============================
  type ContactPaginationResponse {
    success: Boolean!
    message: String
    data: [Contact]
    total: Int
    page: Int
    pages: Int
  }

  # ==============================
  #   BUYER TYPE
  # ==============================
  type Buyer {
    firebaseUid: String
    buyerId: String
    name: String
  }

  # ==============================
  #   INPUTS
  # ==============================
  input CreateContactInput {
    name: String!
    email: String!
    location: String!
    information: String!
    date: String
    phone: String
    sellerId: String
    serviceId: String
    buyerId: String
  }

  input UpdateContactInput {
    name: String
    email: String
    location: String
    information: String
    phone: String
    status: String
  }

  # ==============================
  #   QUERIES
  # ==============================
  type Query {
    getAllContacts(
      page: Int
      limit: Int
      status: String
      sortBy: String
    ): ContactPaginationResponse

    getContactById(id: ID!): Contact

    getContactsBySellerId(sellerId: String!): [Contact]

    getContactsByEmail(email: String!): [Contact]

    getContactsByStatus(status: String!): [Contact]

    getConfirmedContact(buyerId: String!): [Contact]
    getPendingContact(buyerId: String!): [Contact]
    getCancelledContact(buyerId: String!): [Contact]

    getBuyerfirebaseUidInServiceBooking(firebaseUid: String!): Buyer
  }

  # ==============================
  #   MUTATIONS
  # ==============================
  type Mutation {
    createContact(input: CreateContactInput!): ContactResponse

    updateContactStatus(id: ID!, status: String!): ContactResponse

    updateContact(id: ID!, input: UpdateContactInput!): ContactResponse

    deleteContact(id: ID!): DeleteResponse
  }

  # ==============================
  #   RESPONSE TYPES
  # ==============================
  type ContactResponse {
    success: Boolean!
    message: String
    data: Contact
    errors: [String]
  }

  type DeleteResponse {
    success: Boolean!
    message: String
    deletedId: ID
  }
`;