import { gql } from "apollo-server-express";

export const regulatoryTypeDefs = gql`
  type Regulatory {
    id: ID!
    title: String
    date: String
    imagePath: String!
    shortDescription: String!
    fullDescription: String!
    createdAt: String
    updatedAt: String
  }

  input RegulatoryInput {
    title: String!
    date: String
    imagePath: String!
    shortDescription: String!
    fullDescription: String!
  }

  type Query {
    regulatory(id: ID!): Regulatory
    regulatoryAll: [Regulatory]
  }

  type Mutation {
    createRegulatory(input: RegulatoryInput!): Regulatory
    updateRegulatory(id: ID!, input: RegulatoryInput!): Regulatory
    deleteRegulatory(id: ID!): Regulatory
  }
`;