import {gql} from 'graphql-request';

export const sellerProductsUpdateTypeDefs = gql`
  type SellerProductsUpdate {
    customId: ID
    # firebaseUid: String
    # name: String
    # companyName: String
    # PANnumber: String
    # gstNumber: String
    # address: String
    # bankIFCnumber: String
    # bankAccountNumber: String
    # email: String
    # phoneNumber: String
    # status: SellerStatus
    # shippingAddresses: [String!]
    # pickupAddresses: [String!]
    # companyPan: String
    # bankName: String
    Drone : [DroneUpdate]
    Part : [PartUpdate]
    Accessory : [AccessoryUpdate]
    HirePilot : [HirePilotUpdate]
    HireJob : [HireJobUpdate]
    Service : [ServiceUpdate]
    }
    input DroneUpdate {
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
    input PartUpdate {
        partId: String
        name: String!
        brand: String!
        price: Float!
        description: String
        image: String
        quantity: Int
        status: String!
    }
    input AccessoryUpdate {
        accessoryId: String
        name: String!
        brand: String!
        price: Float!
        description: String
        image: String
        quantity: Int
        status: String!
    }
    input HirePilotUpdate {
        pilotId: String
        pilotName: String
        pilotCompany: String
        location: String
        availability: Boolean
        specification: String
        price: Price
        certifications:{
            url: String!
            filename: String
        }
        resume: {
            url: String!
            filename: String
        }
        description: String
        newemail: String
        newphoneNumber: String
        adminStatus: String
    }
    input HireJobUpdate {
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
    input ServiceUpdate {
        name: String!
        specificDrone: String!
        experience: Int!
        location: String!
        description: String
        price: Float!
        image: String
        status: String!
    }
    type UpdateResponse {
                success: Boolean!
                message: String!
}
    type mutation {
        SellerProductsUpdate(customId: ID! , drone: [DroneUpdate], part: [PartUpdate], accessory: [AccessoryUpdate], hirePilot: [HirePilotUpdate], hireJob: [HireJobUpdate], service: [ServiceUpdate]): UpdateResponse
    }

        
`;