import React, { useState } from "react";
import { ApolloClient, InMemoryCache, HttpLink, ApolloProvider, useQuery, useMutation, gql } from "@apollo/client";
import "../styles/TrainingBookingStatus.css";
const client = new ApolloClient({
  link: new HttpLink({ uri: "https://flyhub-webadmin-4.onrender.com/graphql" }),
  cache: new InMemoryCache(),
});


const GET_TRAININGS = gql`
  query GetTrainings($search: String) {
    getTrainings(search: $search) {
      id
      title
      amount
      gst
      totalAmount
      days
      shortDescription
      fullDescription
    }
  }
`;

const DELETE_TRAINING = gql`
  mutation DeleteTraining($id: ID!) {
    deleteTraining(id: $id)
  }
`;

const GET_ENROLLMENTS = gql`
  query GetEnrollments {
    getEnrollments {
      id
      courseTitle
      courseDays
      totalAmount
      name
      email
      phone
      status
      createdAt
    }
  }
`;

const TrainingList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { loading, error, data, refetch } = useQuery(GET_TRAININGS, {
    variables: { search: searchTerm },
  });

  const [deleteTraining, { loading: deleting }] = useMutation(DELETE_TRAINING, {
    onCompleted: () => refetch(),
    onError: (err) => alert("❌ Error deleting: " + err.message),
  });

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this training?")) {
      deleteTraining({ variables: { id } });
    }
  };

  if (loading) return <p>Loading trainings...</p>;
  if (error) return <p>❌ Error: {error.message}</p>;

  return (
    <div className="training-status-container">
      <h2 className="training-status-title">Training List</h2>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search trainings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={() => refetch()}>🔍 Search</button>
      </div>

      <div className="training-list">
        {data.getTrainings.length === 0 ? (
          <p>No trainings found.</p>
        ) : (
          data.getTrainings.map((training) => (
            <div className="training-card" key={training.id}>
              <div className="training-card-header">
                <span className="training-id">{training.id}</span>
                <span className="training-title">{training.title}</span>
              </div>

              <div className="training-card-body">
                <p>Amount: ₹ {training.amount}</p>
                <p>GST: {training.gst}%</p>
                <p>Total: ₹ {training.totalAmount}</p>
                <p>Days: {training.days}</p>
                <p>{training.shortDescription}</p>
              </div>

              <div className="training-card-footer">
                <button
                  className="training-delete-btn"
                  onClick={() => handleDelete(training.id)}
                  disabled={deleting}
                  style={{ backgroundColor: "#dc3545", color: "#fff" }}
                >
                  {deleting ? "Deleting..." : "🗑 Delete"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};


const TrainingBookingStatus = () => {
  const [activeTab, setActiveTab] = useState("All");
  const { loading, error, data } = useQuery(GET_ENROLLMENTS);

  const statusTabs = ["All", "Pending", "Approved", "Rejected", "Completed"];

  if (loading) return <p>Loading enrollments...</p>;
  if (error) return <p>❌ Error: {error.message}</p>;

  const filteredBookings =
    activeTab === "All"
      ? data.getEnrollments
      : data.getEnrollments.filter((b) => b.status === activeTab);

  return (
    <div className="training-status-container">
      <h2 className="training-status-title">Training Booking Status</h2>

      <div className="training-tabs">
        {statusTabs.map((tab) => (
          <button
            key={tab}
            className={`training-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="training-list">
        {filteredBookings.length === 0 ? (
          <p>No bookings found.</p>
        ) : (
          filteredBookings.map((item) => (
            <div className="training-card" key={item.id}>
              <div className="training-card-header">
                <span className="training-id">{item.id}</span>
                <span
                  className={`training-status status-${item.status?.toLowerCase()}`}
                >
                  {item.status}
                </span>
              </div>

              <div className="training-card-body">
                <p>
                  <span>Training:</span> {item.courseTitle}
                </p>
                <p>
                  <span>Name:</span> {item.name}
                </p>
                <p>
                  <span>Email:</span> {item.email}
                </p>
                <p>
                  <span>Total:</span> ₹ {item.totalAmount}
                </p>
                <p>
                  <span>Days:</span> {item.courseDays}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const TrainingDashboard = () => {
  return (
    <ApolloProvider client={client}>
      <div className="App">
        <TrainingList />
        <TrainingBookingStatus />
      </div>
    </ApolloProvider>
  );
};

export default TrainingDashboard;