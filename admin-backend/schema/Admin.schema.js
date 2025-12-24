import { gql } from "apollo-server-express";

export const adminTypeDefs = gql`
  type Admin {
    id: ID!
    name: String!
    email: String!
    role: String
    subRole: String
    assignedPage: String
    profileImage: String
    token: String
  }

  type AuthResponse {
    success: Boolean!
    message: String!
    token: String
    refreshToken: String
    user: Admin
  }

  type AdminInfo {
    id: ID
    email: String
    name: String
    role: String
  }

  type Query {
    testAdminToken: AdminInfo
    getAllAdmins: [Admin]
  }

  type Mutation {
    adminRegister(name: String!, email: String!, password: String!): AuthResponse!
    createSubAdmin(
      name: String!
      email: String!
      password: String!
      role: String
      subRole: String
      assignedPage: String
      profileImage: String
    ): AuthResponse!
    deleteAdmin(id: ID!): AuthResponse!
    adminLogin(email: String!, password: String!): AuthResponse!
    refreshAdminToken(refreshToken: String!): AuthResponse!
  }
`;
