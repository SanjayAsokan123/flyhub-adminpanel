import { gql } from "apollo-server-express";

export const discountTypeDefs = gql`
  type Discount {
    _id: ID!
    discountForDrones: Int
    discountForAccessory: Int
    discountForParts: Int
    createdAt: String
    updatedAt: String
  }

  type Query {
    getDiscounts: Discount
  }

  input UpdateDiscountInput {
    discountForDrones: Int
    discountForAccessory: Int
    discountForParts: Int
  }

  type Mutation {
    updateDiscounts(input: UpdateDiscountInput!): Discount
  }
`;