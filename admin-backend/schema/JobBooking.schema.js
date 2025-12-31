import { gql } from 'apollo-server-express';

export const jobApplicationTypeDefs = gql`
  scalar Date

  type JobApplication {
    id: ID!
    buyerId: String
    sellerId: String!
    jobId: String!
    jobTitle: String
    companyName: String
    name: String!
    email: String!
    phoneNumber: String!
    resumeUrl: String!
    status: String!
    appliedAt: Date
    createdAt: Date
    updatedAt: Date
  }

input JobApplicationInput {
  jobId: String!
  name: String!
  email: String!
  phoneNumber: String!
  resumeUrl: String!
}


  input UpdateApplicationStatusInput {
    applicationId: ID!
    status: String!
  }

  type JobApplicationResponse {
    success: Boolean!
    message: String
    application: JobApplication
  }

  type JobApplicationStats {
    total: Int!
    pending: Int!
    rejected: Int!
    hired: Int!
  }

  type JobApplicationSummary {
    jobId: String!
    jobName: String
    companyName: String
    bookingId: String
    status: String!
    createdAt: Date
  }

extend type Query {
  getJobApplications: [JobApplication!]!

  getSellerApplications(sellerId: String!): [JobApplication!]!
  getPendingApplications(sellerId: String!): [JobApplication!]!
  getRejectedApplications(sellerId: String!): [JobApplication!]!
  getHiredApplications(sellerId: String!): [JobApplication!]!

  getBuyerPendingApplications(buyerId: String): [JobApplication]
  getBuyerRejectedApplications(buyerId: String): [JobApplication]
  getBuyerHiredApplications(buyerId: String): [JobApplication]

  buyerJobApplyStatus(buyerId: String!): [JobApplicationSummary!]!
  getApplicationById(id: ID!): JobApplication
  getApplicationStats(sellerId: String!): JobApplicationStats!
}


  extend type Mutation {
    submitJobApplication(input: JobApplicationInput!): JobApplicationResponse!
    updateApplicationStatus(input: UpdateApplicationStatusInput!): JobApplicationResponse!
    deleteApplication(id: ID!): JobApplicationResponse!
  }
`;