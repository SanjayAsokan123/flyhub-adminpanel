import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
  Observable,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

// =====================================
// 🚀 GraphQL backend endpoint
// =====================================
const httpLink = createHttpLink({
  uri: "https://flyhub-webadmin-4.onrender.com/graphql",
});

// =====================================
// 🔐 Attach access token to each request
// =====================================
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("accessToken");
  return {
    headers: {
      ...headers,
      Authorization: token ? `Bearer ${token}` : "",
    },
  };
});

// =====================================
// 🔄 Auto-refresh link
// =====================================
const refreshLink = new ApolloLink((operation, forward) => {
  return new Observable((observer) => {
    let subscription;

    const handleNext = async (response) => {
      const errors = response?.errors || [];

      // Detect token errors
      const isUnauthorized = errors.some((err) =>
        ["Unauthorized", "expired", "Invalid token"].some((msg) =>
          err.message.includes(msg)
        )
      );

      // If no token error → normal flow
      if (!isUnauthorized) {
        observer.next(response);
        observer.complete();
        return;
      }

      console.warn("🔄 Access token expired, attempting refresh...");

      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        console.error("❌ No refresh token found, logging out.");
        logoutUser();
        return;
      }

      try {
        // Call refreshAdminToken mutation
        const refreshResponse = await fetch("https://flyhub-webadmin-4.onrender.com/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              mutation Refresh($token: String!) {
                refreshAdminToken(refreshToken: $token) {
                  success
                  token
                }
              }
            `,
            variables: { token: refreshToken },
          }),
        });

        const json = await refreshResponse.json();
        const newToken = json?.data?.refreshAdminToken?.token;

        if (!newToken) {
          console.error("❌ Token refresh failed.");
          logoutUser();
          return;
        }

        console.log("✅ Token refreshed successfully!");
        localStorage.setItem("accessToken", newToken);

        // Retry original request with new token
        const oldHeaders = operation.getContext().headers;
        operation.setContext({
          headers: {
            ...oldHeaders,
            Authorization: `Bearer ${newToken}`,
          },
        });

        subscription = forward(operation).subscribe(observer);
      } catch (err) {
        console.error("❌ Refresh error:", err);
        logoutUser();
      }
    };

    // Perform original request
    subscription = forward(operation).subscribe({
      next: handleNext,
      error: (err) => observer.error(err),
      complete: () => observer.complete(),
    });

    return () => subscription?.unsubscribe();
  });
});

// =====================================
// 🚪 Logout Utility
// =====================================
function logoutUser() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  window.location.href = "/login";
}

// =====================================
// 🌐 Apollo Client Export
// =====================================
export const client = new ApolloClient({
  link: ApolloLink.from([refreshLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  connectToDevTools: true,
});
