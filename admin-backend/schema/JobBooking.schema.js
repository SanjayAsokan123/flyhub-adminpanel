  // JobApplication.schema.js
  import { gql } from 'apollo-server-express';

  export const jobApplicationTypeDefs = gql`
    scalar Date

    type JobApplication {
      id: ID!
      jobId: String!
      name: String!
      email: String!
      phoneNumber: String!
      resumeUrl: String!
      status: String!
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
      reviewed: Int!
      shortlisted: Int!
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
      getJobApplications(jobId: String): [JobApplication!]!
      getMyApplications(email: String!): [JobApplication!]!
      getApplicationById(id: ID!): JobApplication
      getPendingApplications(jobId: String): [JobApplication!]!
      getRejectedApplications(jobId: String): [JobApplication!]!
      getHiredApplications(jobId: String): [JobApplication!]!
      getReviewedApplications(jobId: String): [JobApplication!]!
      getShortlistedApplications(jobId: String): [JobApplication!]!
      getApplicationsByStatus(jobId: String, status: String!): [JobApplication!]!
      getApplicationStats(jobId: String): JobApplicationStats!
      buyerJobApplyStatus(buyerId: String!): [JobApplicationSummary!]!
    }

    extend type Mutation {
      submitJobApplication(input: JobApplicationInput!): JobApplicationResponse!
      updateApplicationStatus(input: UpdateApplicationStatusInput!): JobApplicationResponse!
      deleteApplication(id: ID!): JobApplicationResponse!
    }
  `;