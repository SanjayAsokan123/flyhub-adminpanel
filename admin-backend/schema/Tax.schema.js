import { gql } from "apollo-server-express";

export const taxTypeDefs = gql`
  type Tax {
    id: ID!
    sgst: Float
    commission: Float
    createdAt: String
    updatedAt: String
  }

  input TaxInput {
    sgst: Float
    commission: Float
  }

  type Query {
    getTax: Tax
  }

  type Mutation {
    updateTax(input: TaxInput!): Tax
  }
`;