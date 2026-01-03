import { gql } from "apollo-server-express";

export const announcementTypeDefs = gql`
  type Announcement {
    id: ID!
    image: String!
    title: String!
    message: String!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type AnnouncementResponse {
    success: Boolean!
    message: String!
    data: Announcement
  }

  type Query {
    getActiveAnnouncement: Announcement
  }

  type Mutation {
    createAnnouncement(
      image: String!
      title: String!
      message: String!
      isActive: Boolean
    ): AnnouncementResponse

    updateAnnouncement(
      id: ID!
      image: String
      title: String
      message: String
      isActive: Boolean
    ): AnnouncementResponse

    deleteAnnouncement(id: ID!): AnnouncementResponse
  }
`;