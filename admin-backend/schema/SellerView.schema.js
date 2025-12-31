import { gql } from "apollo-server-express";

export const SellerViewTypeDefs = gql`
    type SellerView {
        customId: String
        email: String
        phoneNumber: String
        name: String
        companyName: String
        address: String
        status: String
        parts: [partsView]
        accessories: [accessoriesView]
        rentals: [rentalsView]
        services: [ServicesView]
        drones: [DroneView]
        hirejobs: [jobView]
        hirepilots: [HirePilotView]

    }
    type partsView
    {
        partId: String
        name: String
        brand: String
        price: Float
        description: String
        image: String
        quantity: Int
        status: String
    }
    type accessoriesView
    {
        accessoryId: String
        name: String
        brand: String
        price: Float
        description: String
        image: String
        quantity: Int
        status: String
    }
    type rentalsView
    {
        rentalId: String
        name: String
        brand: String
        location: String
        pricePerHour: Float
        pricePerDay: Float
        description: String
        image: String
        status: String
    }
    type ServicesView
    {
        serviceId: String
        name: String
        description: String
        price: Float
        image: String
        specificDrone: String
        experience: Int
        location: String
        status: String
    }
    type HirePilotView
    {
        pilotId: String
        pilotName: String
        pilotCompany: String
        location: String
        availability: Boolean
        specification: String
        price:Price
        description: String
        newemail: String
        newphoneNumber: String
        adminStatus: String
    }
    type DroneView
    {
        droneId: String
        name: String!
        brand: String!
        uin: String
        price: Float!
        description: String
        image: String
        quantity: Int
        status: String!
    }
    type jobView
    {
         jobId: String!
        jobName: String!
        companyName: String!
        jobType: String
        experience: String
        location: String
        salary: String
        description: String
        requirement: String
        email: String
        phoneNumber: String
        status: String!
    }

   extend type Query {
        getSellerView(sellerId: String!): SellerView
        getDronesBySeller(sellerId: String!): [DroneView]
        getPartsBySeller(sellerId: String!): [partsView]
        
        getAccessoriesBySeller(sellerId: String!): [accessoriesView]
        
        getRentalsBySeller(sellerId: String!): [rentalsView]
        
        getServicesBySeller(sellerId: String!): [ServicesView]
        getHirePilotBySeller(sellerId: String!): [HirePilotView]
        getHirejobBySeller(sellerId: String!): [jobView]
       }
`;