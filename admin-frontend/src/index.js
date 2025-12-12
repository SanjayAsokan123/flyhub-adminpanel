import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

// ✅ Import Apollo setup
import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";

import { setContext } from "@apollo/client/link/context";

// ✅ Configure GraphQL connection
const httpLink = createHttpLink({
  uri: "http://127.0.0.1:5001/graphql", // 🔹 Your backend GraphQL endpoint
});

// ✅ Add Auth middleware (automatically adds admin token)
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("accessToken"); // saved after admin login
  return {
    headers: {
      ...headers,
      Authorization: token ? `Bearer ${token}` : "",
    },
  };
});

// ✅ Initialize Apollo Client
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  connectToDevTools: true, // helps you debug Apollo queries in browser
});

// ✅ Root render
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
);

// ✅ Optional: Performance tracking
reportWebVitals();
