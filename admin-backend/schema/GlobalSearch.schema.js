import { gql } from "apollo-server-express";

export const globalSearchTypeDefs = gql`
  type Query {
    globalSearch(
      query: String!
      page: Int
      limit: Int
      filters: SearchFilters
      sortBy: SortOption
    ): SearchResponse!
    
    distinctBrands: [String!]!
    distinctCategories: [String!]!
    searchSuggestions(query: String!): [SearchSuggestion!]!
    testDataCheck: TestDataResponse!
  }
  
  type TestDataResponse {
    counts: DataCounts!
    sampleDrone: SampleItem
    samplePart: SampleItem
    sampleAccessory: SampleItem
  }
  
  type DataCounts {
    drones: Int!
    parts: Int!
    accessories: Int!
  }
  
  type SampleItem {
    id: ID!
    name: String
    brand: String
    price: Float
    category: String
  }
  
  input SearchFilters {
    types: [SearchableType!]
    minPrice: Float
    maxPrice: Float
    brands: [String!]
    categories: [String!]
  }
  
  enum SearchableType {
    DRONE
    PART
    ACCESSORY
  }
  
  enum SortOption {
    RELEVANCE
    PRICE_ASC
    PRICE_DESC
    NEWEST
  }
  
  type SearchResponse {
    results: [SearchResult!]!
    total: Int!
    page: Int!
    totalPages: Int!
    hasNextPage: Boolean!
  }
  
  union SearchResult = DroneSearchResult | PartSearchResult | AccessorySearchResult
  
  type DroneSearchResult {
    id: ID!
    type: String!
    name: String
    brand: String
    model: String
    uin: String
    price: Float
    image: String
    category: String
    score: Float
    description: String
  }
  
  type PartSearchResult {
    id: ID!
    type: String!
    name: String
    brand: String
    model: String
    price: Float
    image: String
    compatibleDrones: [String!]
    score: Float
    description: String
  }
  
  type AccessorySearchResult {
    id: ID!
    type: String!
    name: String
    brand: String
    category: String
    price: Float
    image: String
    description: String
    score: Float
  }
  
  type SearchSuggestion {
    text: String!
    type: String!
  }
`;