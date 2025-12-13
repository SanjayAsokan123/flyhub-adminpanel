import { PubSub } from "graphql-subscriptions";

export const pubsub = new PubSub();

export const BUYER_NOTIFICATION_TOPIC  = "BUYER_NOTIFICATION_ADDED";
export const SELLER_NOTIFICATION_TOPIC  = "SELLER_NOTIFICATION_ADDED";
