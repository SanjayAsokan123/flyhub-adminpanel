import { gql } from "apollo-server-express";

export const returnTypeDefs = gql`
  type SellerDetails {
    sellerId: String
    name: String
    phone: String
    email: String
    address: String
  }

  type BuyerDetails {
    buyerId: String
    name: String
    email: String
    phone: String
    address: String
  }

  type ReturnRequest {
    returnId: String
    orderId: String
    productId: String
    type: String
    reason: String
    deliveryDate: String
    status: String
    proofUrl: String
    seller: SellerDetails
    buyer: BuyerDetails
  }

  input ReturnRequestInput {
    orderId: String
    productId: String
    type: String
    reason: String
    deliveryDate: String
    proofUrl: String
  }

  extend type Query {
    returnRequests: [ReturnRequest]

    returnRequestsByStatus(status: String!): [ReturnRequest]
  }

  extend type Mutation {
    requestReturn(data: ReturnRequestInput!): ReturnRequest

    updateReturnRequest(returnId: String!, data: ReturnRequestInput): ReturnRequest

    updateReturnStatus(returnId: String!, status: String!): ReturnRequest

    deleteReturn(returnId: String!): ReturnRequest
  }
`;
