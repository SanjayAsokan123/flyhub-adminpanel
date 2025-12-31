import React, { useEffect, useState } from "react";
import "../styles/BuyerCart.css";
import { ApolloClient, InMemoryCache, ApolloProvider, useQuery, useMutation, gql } from "@apollo/client";

const GRAPHQL_URL = "https://flyhub-webadmin-4.onrender.com/graphql";

// GraphQL Queries & Mutations
const GET_BUYERS = gql`
  query GetBuyers {
    getAllBuyers {
      buyerId
      name
      email
    }
  }
`;

const GET_CART = gql`
  query GetCart($buyerId: String!) {
    getCart(buyerId: $buyerId) {
      id
      buyerId
      productId
      quantity
      product {
        productId
        name
        price
        image
      }
    }
  }
`;

const ADD_TO_CART = gql`
  mutation AddToCart($buyerId: String!, $productId: String!) {
    addToCart(buyerId: $buyerId, productId: $productId) {
      id
      product {
        name
        price
        image
      }
      quantity
    }
  }
`;

const UPDATE_CART_QTY = gql`
  mutation UpdateCartQty($buyerId: String!, $productId: String!, $quantity: Int) {
    updateCartQty(buyerId: $buyerId, productId: $productId, quantity: $quantity) {
      id
      quantity
    }
  }
`;

const REMOVE_FROM_CART = gql`
  mutation RemoveFromCart($buyerId: String!, $productId: String!) {
    removeFromCart(buyerId: $buyerId, productId: $productId)
  }
`;

// Apollo Client
const client = new ApolloClient({
  uri: GRAPHQL_URL,
  cache: new InMemoryCache(),
});

// Component to show cart for active buyer
const CartContent = ({ buyerId }) => {
  const { loading, error, data, refetch } = useQuery(GET_CART, {
    variables: { buyerId },
  });

  const [updateQty] = useMutation(UPDATE_CART_QTY);
  const [removeItem] = useMutation(REMOVE_FROM_CART);

  if (loading) return <div>Loading cart…</div>;
  if (error) return <div>Error: {error.message}</div>;

  const cartItems = data.getCart;

  const handleUpdateQty = async (productId, newQty) => {
    if (newQty < 1) return;
    await updateQty({ variables: { buyerId, productId, quantity: newQty } });
    refetch();
  };

  const handleRemove = async (productId) => {
    await removeItem({ variables: { buyerId, productId } });
    refetch();
  };

  const total = cartItems.reduce((sum, item) => sum + item.quantity * item.product.price, 0);

  return (
    <div className="cart-panel">
      <h2>Cart for Buyer: {buyerId}</h2>
      <div className="cart-items-container">
        {cartItems.length === 0 ? (
          <p>This buyer's cart is empty</p>
        ) : (
          cartItems.map((item) => (
            <div key={item.id} className="cart-item">
              <div className="item-image">
                <img src={item.product.image} alt={item.product.name} />
              </div>
              <div className="item-details">
                <h3>{item.product.name}</h3>
                <div className="item-price">${item.product.price.toFixed(2)}</div>
                <div className="item-actions">
                  <div className="quantity-control">
                    <button onClick={() => handleUpdateQty(item.productId, item.quantity - 1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => handleUpdateQty(item.productId, item.quantity + 1)}>+</button>
                  </div>
                  <button onClick={() => handleRemove(item.productId)}>Remove</button>
                </div>
              </div>
              <div className="item-total">${(item.quantity * item.product.price).toFixed(2)}</div>
            </div>
          ))
        )}
      </div>
      <div className="cart-summary">
        <strong>Total:</strong> ${total.toFixed(2)}
      </div>
    </div>
  );
};

const CartPage = () => {
  const [activeBuyer, setActiveBuyer] = useState(null);

  // Fetch all buyers
  const { loading, error, data } = useQuery(GET_BUYERS);

  if (loading) return <div>Loading buyers…</div>;
  if (error) return <div>Error loading buyers: {error.message}</div>;

  const buyers = data.getAllBuyers;

  return (
    <ApolloProvider client={client}>
      <div className="cart-page">
        <header className="cart-header">
          <h1>🛒 Shopping Cart Management</h1>
        </header>

        {/* Buyer Panel */}
        <div className="cart-container">
          <div className="buyer-panel">
            <h2>Buyers</h2>
            {buyers.map((buyer) => (
              <div
                key={buyer.buyerId}
                className={`buyer-card ${activeBuyer === buyer.buyerId ? "active" : ""}`}
                onClick={() => setActiveBuyer(buyer.buyerId)}
              >
                <div className="buyer-avatar">{buyer.name.charAt(0)}</div>
                <div className="buyer-info">
                  <h3>{buyer.name}</h3>
                  <p>{buyer.email}</p>
                  <span>ID: {buyer.buyerId}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Cart Content */}
          <div className="cart-panel">
            {activeBuyer ? <CartContent buyerId={activeBuyer} /> : <p>Select a buyer to view their cart</p>}
          </div>
        </div>
      </div>
    </ApolloProvider>
  );
};

export default CartPage;