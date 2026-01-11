import { gql } from "apollo-server-express";

export const pilotAlertStatusTypeDefs = gql`

        enum UserStatus {
        ACTIVE
        PILOT_NOT_AVAILABLE
        }

        enum PilotStatus {
        ASSIGNED
        CONFIRMED
        PENDING
        }

        type PilotAlertStatus {
        id: ID!
        buyerId: String!
        pilotId: String!
        bookingId: String!

        bookingTime: String

        reminderStartTime: String
        reminderCount: Int
        maxReminders: Int
        lastReminderSentAt: String

        userStatus: UserStatus

        pilotStatus: PilotStatus
        pilotNotifyCount: Int
        maxPilotNotify: Int
        pilotLastNotifiedAt: String

        createdAt: String
        updatedAt: String
        }

        input CreatePilotAlertInput {
        buyerId: String!
        pilotId: String!
        bookingId: String!
        reminderStartTime: String
        }

        input UpdatePilotStatusInput {
        id: ID!
        pilotStatus: PilotStatus!
        }

        type Query {
        # 🔍 Fetch by bookingId
        pilotAlertByBookingId(bookingId: String!): PilotAlertStatus

        # 📦 Fetch by status
        pilotAlertsByUserStatus(userStatus: UserStatus!): [PilotAlertStatus!]
        pilotAlertsByPilotStatus(pilotStatus: PilotStatus!): [PilotAlertStatus!]

        # 📋 Fetch all
        allPilotAlerts: [PilotAlertStatus!]
        }

        type Mutation {
        # ➕ Create
        createPilotAlert(input: CreatePilotAlertInput!): PilotAlertStatus!

        # 🔄 Update pilot status
        updatePilotStatus(input: UpdatePilotStatusInput!): PilotAlertStatus!

        # ❌ Delete single
        deletePilotAlert(id: ID!): Boolean!

        # ❌ Delete all (ADMIN / CRON cleanup)
        deleteAllPilotAlerts: Boolean!
  }
`;
