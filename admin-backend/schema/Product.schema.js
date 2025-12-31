import { gql } from "apollo-server-express";

export const productTypeDef = gql`
  type Product {
    productId: String!
    name: String!
    brand: String
    price: Float!
    image: String
    quantity: Int
    description: String
    category: String!
    status: String
  }

  extend type Query {
    getProduct(productId: String): Product
  }
`;
