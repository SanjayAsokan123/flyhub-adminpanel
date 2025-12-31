// jobTypeDefs.js
import { gql } from 'apollo-server-express';

export const jobTypeDefs = gql`
  type Job {
    _id: ID!
    jobId: String!
    jobName: String!
    companyName: String!
    jobType: String
    experience: String
    location: String
    salary: String
    image: String  # ← Add this line
    description: String
    requirement: String
    email: String
    phoneNumber: String
    status: String!
    sellerId: String!
  }

  input JobInput {
    jobName: String!
    companyName: String!
    jobType: String
    experience: String
    image: String  # ← Add this line
    location: String
    salary: String
    description: String
    requirement: String
    sellerId: String
  }

  input JobSearchInput {
    jobName: String
    companyName: String
    jobType: String
    experience: String
    location: String
    salary: String
    description: String
    requirement: String
  }

  type PaginatedJobs {
    items: [Job!]!
    totalCount: Int!
    page: Int!
    limit: Int!
    pageCount: Int!
  }

  input UpdateJobInput {
    jobName: String
    companyName: String
    jobType: String
    experience: String
    location: String
    salary: String
    image: String  # ← Add this line
    description: String
    requirement: String
    sellerId: String
    status: String
  }

  type Query {
    jobs: [Job!]!
    job(jobId: String!): Job
    rejectedJobs(sellerId: String!): [Job!]!
    approvedJobs(sellerId: String): [Job!]!
    pendingJobs(sellerId: String!): [Job!]!
    getAllApprovedJobs: [Job!]!
    approvedJobsPaginated(
      page: Int!
      limit: Int!
      search: JobSearchInput
      query: String
    ): PaginatedJobs!
  }

  type Mutation {
    addJob(input: JobInput!): Job!
    updateJob(jobId: String!, input: UpdateJobInput!): Job!
    updateStatus(jobId: String!, status: String!): Job!
    deleteJob(jobId: String!): Job!
  }
`;