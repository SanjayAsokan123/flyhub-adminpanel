import { gql } from "apollo-server-express";

export const serviceTypeDefs = gql`
  type SellerInfo {
    email: String
    phoneNumber: String
  }

  type Service {
    serviceId: String
    name: String!
    specificDrone: String!
    experience: Int!
    location: String!
    description: String
    price: Float!
    image: String
    status: String!
    sellerId: String!
    sellerInfo: SellerInfo
    createdAt: String
    updatedAt: String
  }

  input ServiceInput {
    name: String!
    specificDrone: String!
    experience: Int!
    location: String!
    description: String
    price: Float!
    image:String
    sellerId: String! # must be Seller.customId
  }
    input ServiceSearchInput 
    {
    name: String
    specificDrone: String
    location: String
    minPrice: Float
    maxPrice: Float
    }

  type PaginatedServices {
    items: [Service!]!
    totalCount: Int!
    page: Int!
    limit: Int!
    pageCount: Int!
  }

  input UpdateServiceInput {
  name: String
  specificDrone: String
  experience: Int
  location: String
  description: String
  price: Float
  image: String
  status: String
}
  type Query {
    services: [Service!]!
    service(serviceId: String!): Service
    approvedServices(sellerId: String!): [Service!]
    pendingServices(sellerId: String!): [Service!]
    rejectedServices(sellerId: String!): [Service!]
    approvedServicesPaginated(page: Int!, limit: Int!, search: ServiceSearchInput, query: String): PaginatedServices
  }

  type Mutation {
    createService(input: ServiceInput!): Service
    updateService(serviceId: String!, input: UpdateServiceInput!): Service
    updateServiceStatus(serviceId: String!, status: String!): Service
    deleteService(serviceId: String!): Service
  }
`;