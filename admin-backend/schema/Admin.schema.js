import { gql } from "apollo-server-express";

export const adminTypeDefs = gql`
  type Admin {
    id: ID!
    name: String!
    email: String!
    token: String
  }

  type AuthResponse {
    success: Boolean!
    message: String!
    token: String
    refreshToken: String
  }

  type AdminInfo {
    id: ID
    email: String
    name: String
  }

  type Query {
    testAdminToken: AdminInfo
  }

  type Mutation {
    adminRegister(name: String!, email: String!, password: String!): AuthResponse!
    adminLogin(email: String!, password: String!): AuthResponse!
    refreshAdminToken(refreshToken: String!): AuthResponse!
  }
`;
