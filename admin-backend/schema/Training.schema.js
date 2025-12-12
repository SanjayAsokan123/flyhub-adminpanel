import { gql } from "apollo-server-express";

export const trainingTypeDefs = gql`
  scalar Date

  type Training {
    id: ID!
    title: String!
    amount: Float!
    gst: Float!
    days: Int!
    totalAmount: Float!
    imagePath: String
    shortDescription: String
    fullDescription: String
    createdAt: Date
    updatedAt: Date
  }

  type TrainingEnroll {
    id: ID!
    courseId: ID!
    courseTitle: String
    courseDays: Int
    totalAmount: Float
    name: String!
    email: String!
    phone: String!
    address: String!
    isTenthPass: Boolean
    isHaveLicence: Boolean
    isAbove18: Boolean
    status: String
    createdAt: Date
    updatedAt: Date
  }

  input TrainingEnrollInput {
    courseId: ID!
    name: String!
    email: String!
    phone: String!
    address: String!
    isTenthPass: Boolean
    isHaveLicence: Boolean
    isAbove18: Boolean
  }

 type TrainingBanner {
    id: ID!
    title: String!
    imagePath: String
  }



  type Query {
    getTrainings(search: String, sortOrder: String): [Training]
    getTrainingById(id: ID!): Training
    getEnrollments: [TrainingEnroll]
    getTrainingBanners: [TrainingBanner]
  }

  type Mutation {
    addTraining(
      title: String!
      amount: Float!
      gst: Float!
      days: Int!
      imagePath: String
      shortDescription: String
      fullDescription: String
    ): Training

    updateTraining(
      id: ID!
      title: String
      amount: Float
      gst: Float
      days: Int
      imagePath: String
      shortDescription: String
      fullDescription: String
    ): Training

    deleteTraining(id: ID!): String

    enrollTraining(input: TrainingEnrollInput!): TrainingEnroll
  }

  type Subscription {
    trainingUpdated: TrainingNotification
  }

  type TrainingNotification {
    action: String!
    training: Training!
    timestamp: String!
  }
`;
