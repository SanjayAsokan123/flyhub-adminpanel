import { gql } from "apollo-server-express";

export const droneTypeDefs = gql`
  type WishlistUser {
    userId: ID!
    addedAt: String
  }

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
    status: String!
    wishlist: [WishlistUser]
    sellerId: String
    sellerInfo: SellerInfo
  }

  input DroneInput {
    name: String!
    brand: String!
    uin: String
    price: Float!
    description: String!
    image: String
    status: String
    sellerId: String!
  }

  type Query {
    drones: [Drone!]
    drone(id: ID!): Drone
    rejectedDrones(sellerId: String!): [Drone!]
      approvedDrones(sellerId: String!): [Drone!]
      pendingDrones(sellerId: String!): [Drone!]
  }

  type Mutation {
  saveSellerFcmToken(sellerId: String!, token: String!): Boolean
    createDrone(input: DroneInput!): Drone
    updateDrone(uin: String!, input: DroneInput!): Drone
    deleteDrone(uin: String!): Drone
    updateDroneStatus(uin: String!, status: String!): Drone
  }
`;
