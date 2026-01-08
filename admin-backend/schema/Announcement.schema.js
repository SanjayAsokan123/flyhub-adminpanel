import { gql } from "apollo-server-express";

export const announcementTypeDefs = gql`
  type Announcement {
    id: ID!
    imagePath: String!
    imageUrl: String!
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
    getAllAnnouncements: [Announcement]
  }

  type Mutation {
    createAnnouncement(
      imagePath: String!
      imageUrl: String!
      title: String!
      message: String!
      isActive: Boolean
    ): AnnouncementResponse

    updateAnnouncement(
      id: ID!
      imagePath: String
      imageUrl: String
      title: String
      message: String
      isActive: Boolean
    ): AnnouncementResponse

    deleteAnnouncement(id: ID!): AnnouncementResponse
  }
`;