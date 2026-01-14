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
     additionalInformation:String
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
     additionalInformation:String
    sellerId: String!
  }

  
  type DronePage {
    items: [Drone!]!
    totalCount: Int!
    page: Int!
    limit: Int!
    pageCount: Int!
  }

  input UpdateDroneInput {
  name: String
  brand: String
  uin: String
  price: Float
  description: String
  quantity: Int
  status: String
   additionalInformation:String
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
    updateDrone(droneId: String!, input: UpdateDroneInput!): Drone
    deleteDrone(droneId: String!): Drone
    updateDroneStatus(droneId: String!, status: String!): Drone
  }
`;