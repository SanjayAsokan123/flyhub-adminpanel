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
    location: String
    salary: String
    description: String
    requirement: String
    sellerId: String
  }

  type Query {
    jobs: [Job!]!
    job(jobId: String!): Job
    rejectedJobs(sellerId: String!): [Job!]!
    approvedJobs(sellerId: String): [Job!]!
    pendingJobs(sellerId: String!): [Job!]!
    getAllApprovedJobs: [Job!]!
  }

  type Mutation {
    addJob(input: JobInput!): Job!
    updateJob(jobId: String!, input: JobInput!): Job!
    updateStatus(jobId: String!, status: String!): Job!
    deleteJob(jobId: String!): Job!
  }
`;