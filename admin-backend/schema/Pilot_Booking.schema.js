import { gql } from "apollo-server-express";

export const pilotBookingTypeDefs = gql`
  scalar Date
  
  type PilotBooking {
    id: ID!
    bookingId: String!
    pilotId: String!
    pilotName: String
    pilotCompany: String
    pilotType: String # "seller" or "buyer"
    
    # Pilot details (can be useful for display)
    pilotSpecification: String
    pilotLocation: String
    pilotPricePerHour: Float
    pilotPricePerDay: Float
    
    # Booker information
    buyerId: String!
    buyerName: String!
    buyerEmail: String!
    contact: String!
    
    # Booking details
    location: String!
    date: String!
    startTime: String!
    endTime: String!
    duration: Float  # in hours
    totalAmount: Float
    
    status: String!
    paymentStatus: String
    
    # For seller pilots
    sellerId: String
    sellerEmail: String
    sellerPhone: String
    sellerName: String
    
    # For buyer pilots (who owns the pilot listing)
    pilotOwnerId: String
    pilotOwnerType: String
    
    # Soft delete flags
    buyerDeleted: Boolean
    ownerDeleted: Boolean
    
    # Additional info
    notes: String
    rejectionReason: String
    
    # Timestamps
    createdAt: Date
    updatedAt: Date
  }

  input BookPilotInput {
    pilotId: String!
    buyerId: String!
    buyerEmail: String!
    buyerName: String!
    contact: String!
    location: String!
    date: String!
    startTime: String!
    endTime: String!
    pilotType: String # "seller" or "buyer", defaults to "seller"
  }

  input UpdateBookingStatusInput {
    bookingId: String!
    status: String!
    userType: String # "seller" or "buyer"
    userId: String
    notes: String
    rejectionReason: String
  }

  type DeleteResponse {
    success: Boolean!
    message: String!
  }

  type BookPilotResponse {
    success: Boolean!
    message: String!
    booking: PilotBooking
    bookingSummary: BookingSummary
  }

  type BookingSummary {
    bookingId: String
    pilotName: String
    date: String
    time: String
    duration: Float
    totalAmount: Float
  }

  type BookingStats {
    total: Int!
    pending: Int!
    approved: Int!
    rejected: Int!
    completed: Int!
    cancelled: Int!
    
    # Financial stats
    totalRevenue: Float
    pendingRevenue: Float
    completedRevenue: Float
    
    # Type breakdown
    sellerBookings: Int
    buyerBookings: Int
  }

  type PilotBookingWithDetails {
    booking: PilotBooking!
    pilotDetails: PilotDetails
    buyerDetails: UserDetails
    ownerDetails: UserDetails
  }

  type PilotDetails {
    specifications: String
    certifications: [String]
    experience: String
    rating: Float
    totalBookings: Int
  }

  type UserDetails {
    name: String
    email: String
    phone: String
    avatar: String
  }

  extend type Query {
    # Seller queries
    getSellerPilotBookings(sellerId: String!, status: String): [PilotBooking!]!
    getSellerPilotBookingsByPilot(sellerId: String!, pilotId: String!, status: String): [PilotBooking!]!
    
    # Filtered seller bookings
    getSellerPendingPilotBookings(sellerId: String!): [PilotBooking!]!
    getSellerApprovedPilotBookings(sellerId: String!): [PilotBooking!]!
    getSellerRejectedPilotBookings(sellerId: String!): [PilotBooking!]!
    getSellerCompletedPilotBookings(sellerId: String!): [PilotBooking!]!
    
    # Buyer queries
    getBuyerPilotBookings(buyerId: String!, status: String, role: String): [PilotBooking!]!
    getBuyerPilotBookingsWithDetails(buyerId: String!, status: String): [PilotBookingWithDetails!]!
    
    # Filtered buyer bookings
    getBuyerPendingPilotBookings(buyerId: String!): [PilotBooking!]!
    getBuyerApprovedPilotBookings(buyerId: String!): [PilotBooking!]!
    getBuyerRejectedPilotBookings(buyerId: String!): [PilotBooking!]!
    getBuyerCompletedPilotBookings(buyerId: String!): [PilotBooking!]!
    
    # For buyer pilot owners
    getBuyerPilotOwnerBookings(buyerId: String!, status: String): [PilotBooking!]!
    
    # Admin queries
    getAllPilotBookings(
      page: Int
      limit: Int
      status: String
      pilotType: String
      startDate: String
      endDate: String
    ): [PilotBooking!]!
    
    getPilotBookingById(bookingId: String!): PilotBookingWithDetails
    getBuyerSpecificPilotBookings(buyerId: String!, status: String): [PilotBooking!]!
    getBuyerPilotOwnerSpecificBookings(buyerId: String!, status: String): [PilotBooking!]!
    # Stats
    getPilotBookingStats(userId: String!, userType: String!): BookingStats!
    getAdminPilotBookingStats: BookingStats!
    
    # Search
    searchPilotBookings(
      query: String!
      status: String
      pilotType: String
    ): [PilotBooking!]!
  }

  extend type Mutation {
    # Create booking
    bookPilot(input: BookPilotInput!): BookPilotResponse!
    
    # Update booking
    updatePilotBookingStatus(input: UpdateBookingStatusInput!): PilotBooking!
    
    deletePilotBookingByBuyer(
    bookingId: String!
    buyerId: String!
    # REMOVE THIS: reason: String
  ): DeleteResponse!
    
    deletePilotBookingByOwner(
      bookingId: String!
      ownerId: String!
      pilotType: String!
      reason: String
    ): DeleteResponse!
    
    # Admin actions
    adminDeletePilotBooking(bookingId: String!): DeleteResponse!
    
    # Payment
    updatePilotBookingPayment(
      bookingId: String!
      paymentStatus: String!
      transactionId: String
    ): PilotBooking!
    
    # Notes
    addPilotBookingNotes(
      bookingId: String!
      notes: String!
      userType: String!
      userId: String!
    ): PilotBooking!
  }

  extend type Subscription {
    newPilotBooking: PilotBooking
    newBuyerPilotBooking: PilotBooking
    newSellerPilotBooking: PilotBooking
    pilotBookingUpdated(bookingId: String): PilotBooking
    pilotBookingStatusChanged(status: String): PilotBooking
  }
`;