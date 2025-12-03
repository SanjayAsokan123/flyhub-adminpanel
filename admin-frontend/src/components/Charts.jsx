import "../styles/Charts.css";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Legend,
  LineChart, Line
} from "recharts";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { useState } from "react";

const COLORS = ["#9333ea", "#a855f7", "#c084fc", "#ddd"];

const GET_TRENDS = gql`
  query GetTrends($days: Int) {
    getSellerTrends(days: $days) {
      date
      count
    }
    getBuyerTrends(days: $days) {
      date
      count
    }
  }
`;

export default function Charts({ stats }) {
  const [days, setDays] = useState(30);

  const { loading, error, data, refetch } = useQuery(GET_TRENDS, {
    variables: { days },
  });

  const handleRangeChange = (e) => {
    const newDays = parseInt(e.target.value);
    setDays(newDays);
    refetch({ days: newDays });
  };

  const pieData = [
    { name: "Approved", value: stats.approvedSellers },
    { name: "Pending", value: stats.pendingSellers },
    { name: "Rejected", value: stats.rejectedSellers },
  ];

  const barData = [
    { category: "Sellers", count: stats.totalSellers },
    { category: "Buyers", count: stats.totalBuyers },
  ];

  const lineData = [];
  if (data?.getSellerTrends || data?.getBuyerTrends) {
    const sellerMap = new Map(data.getSellerTrends.map(i => [i.date, i.count]));
    const buyerMap = new Map(data.getBuyerTrends.map(i => [i.date, i.count]));

    const allDates = new Set([...sellerMap.keys(), ...buyerMap.keys()]);

    [...allDates].sort().forEach(date => {
      lineData.push({
        date,
        sellers: sellerMap.get(date) || 0,
        buyers: buyerMap.get(date) || 0,
      });
    });
  }

  return (
    <div className="charts-grid">
      <div className="chart-section">
        <h2>Seller Status Distribution</h2>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={90}
              dataKey="value"
              label
            >
              {pieData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-section">
        <h2>Sellers vs Buyers</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#9333ea" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-section">
        <div className="chart-header">
          <h2>📈 Seller vs Buyer Trends</h2>
          <select value={days} onChange={handleRangeChange} className="chart-filter">
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </div>

        {loading ? (
          <p>Loading trends…</p>
        ) : error ? (
          <p style={{ color: "red" }}>Error: {error.message}</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />

              <Line type="monotone" dataKey="sellers" stroke="#9333ea" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="buyers" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
