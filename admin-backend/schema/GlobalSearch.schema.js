import { gql } from "apollo-server-express";

export const globalSearchTypeDef = gql`
  type Query {
    globalSearch(
      query: String!
      page: Int = 1
      limit: Int = 10
      filters: SearchFilters
      sortBy: SortOption = RELEVANCE
    ): SearchResponse!
  }


# =========================
# INTERFACES
# =========================

interface Searchable {
  id: ID!
  type: String!
  score: Float!
  relevance: RelevanceScore!
}

type RelevanceScore {
  textMatch: Float!
  popularity: Float!
  recency: Float!
}

# =========================
# QUERY
# =========================
type Query {
  globalSearch(
    query: String!
    page: Int = 1
    limit: Int = 10
    filters: SearchFilters
    sortBy: SortOption = RELEVANCE
  ): SearchResponse!
}

# =========================
# INPUTS
# =========================
input SearchFilters {
  types: [SearchableType!]
  minPrice: Float
  maxPrice: Float
  brands: [String!]
  categories: [String!]
  locations: [String!]
  availability: Boolean
}

enum SearchableType {
  DRONE
  PART
  ACCESSORY
  PILOT
  JOB
  SERVICE
}

enum SortOption {
  RELEVANCE
  PRICE_ASC
  PRICE_DESC
  NEWEST
}

# =========================
# RESPONSE
# =========================
type SearchResponse {
  results: [SearchResult!]!
  total: Int!
  page: Int!
  totalPages: Int!
  hasNextPage: Boolean!
  aggregations: SearchAggregations!
}

type SearchAggregations {
  types: [TypeAggregation!]!
  brands: [BrandAggregation!]!
  categories: [CategoryAggregation!]!
  priceRange: PriceRange!
}

type TypeAggregation {
  type: SearchableType!
  count: Int!
}

type BrandAggregation {
  brand: String!
  count: Int!
}

type CategoryAggregation {
  category: String!
  count: Int!
}

type PriceRange {
  min: Float!
  max: Float!
}

# =========================
# UNION
# =========================
union SearchResult =
    DroneSearchResult
  | PartSearchResult
  | AccessorySearchResult
  | HirePilotSearchResult
  | HireJobSearchResult
  | ServiceSearchResult

# =========================
# DRONE
# =========================
type DroneSearchResult implements Searchable {
  id: ID!
  type: String!
  score: Float!
  relevance: RelevanceScore!

  name: String
  brand: String
  model: String
  uin: String
  price: Float
  image: String
  quantity: Int
  category: String
}

# =========================
# PART
# =========================
type PartSearchResult implements Searchable {
  id: ID!
  type: String!
  score: Float!
  relevance: RelevanceScore!

  name: String
  brand: String
  model: String
  description: String
  price: Float
  image: String
  quantity: Int
}

# =========================
# ACCESSORY
# =========================
type AccessorySearchResult implements Searchable {
  id: ID!
  type: String!
  score: Float!
  relevance: RelevanceScore!
  name: String
  brand: String
  category: String
  description: String
  price: Float
  image: String
  quantity: Int
}

# =========================
# HIRE PILOT
# =========================
type PilotPrice {
  perHour: Float
  perDay: Float
}
type File {
  url: String!
}

type HirePilotSearchResult implements Searchable {
  id: ID!
  type: String!
  score: Float!
  relevance: RelevanceScore!
  pilotName: String
  pilotCompany: String
  location: String
  availability: Boolean
  specification: String
  PilotPrice: PilotPrice
  certifications: [File]
  resume: File
  description: String
}

# =========================
# HIRE JOB
# =========================
type HireJobSearchResult implements Searchable {
  id: ID!
  type: String!
  score: Float!
  relevance: RelevanceScore!
  jobName: String
  companyName: String
  jobType: String
  experience: String
  location: String
  salary: Float
  description: String
  requirement: String
}

# =========================
# SERVICE
# =========================
type ServiceSearchResult implements Searchable {
  id: ID!
  type: String!
  score: Float!
  relevance: RelevanceScore!
  serviceName: String
  serviceType: String
  location: String
  price: Float
  availability: Boolean
  description: String
}

`;