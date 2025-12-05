import { gql } from "apollo-server-express";

export const ServiceBookingTypeDefs = gql`

  # ==============================
  #   CONTACT TYPE
  # ==============================
  type Contact {
    id: ID!
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
    createdAt: String
    updatedAt: String
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
  #   INPUT TYPES
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
    serviceBookingId: String!
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

    getConfirmedContact: [Contact]
        getPendingContact: [Contact]
        getCancelledContact: [Contact]
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
