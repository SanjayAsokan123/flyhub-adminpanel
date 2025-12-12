import { gql } from "apollo-server-express";

export const droneTypeDefs = gql`
  type SellerInfo {
    email: String
    phoneNumber: String
  }

  type Drone {
    droneId: String
    name: String!
    brand: String!
    uin: String
    price: Float!
    description: String
    image: String
    quantity: Int
    status: String!
    sellerId: String
    sellerInfo: SellerInfo
  }

  input DroneInput {
    name: String!
    brand: String!
    uin: String
    price: Float!
    description: String!
    image: String!  
    quantity: Int
    status: String
    sellerId: String!
  }

  
  type DronePage {
    items: [Drone!]!
    totalCount: Int!
    page: Int!
    limit: Int!
    pageCount: Int!
  }

  type Query {
    drones: [Drone!]
    drone(id: ID!): Drone
    rejectedDrones(sellerId: String!): [Drone!]
      approvedDrones(sellerId: String!): [Drone!]
      pendingDrones(sellerId: String!): [Drone!]
      approvedDronePaginated(page: Int!, limit: Int!): DronePage!
  }

  type Mutation {
  saveSellerFcmToken(sellerId: String!, token: String!): Boolean
    createDrone(input: DroneInput!): Drone
    updateDrone(uin: String!, input: DroneInput!): Drone
    deleteDrone(uin: String!): Drone
    updateDroneStatus(uin: String!, status: String!): Drone
  }
`;
