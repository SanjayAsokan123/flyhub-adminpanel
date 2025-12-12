import "../styles/Cards.css";

function Cards({ stats }) {
  return (
    <div className="cards">
      <div className="card purple">
        <h2>Total Sellers</h2>
        <p className="number">{stats.totalSellers}</p>
      </div>

      <div className="card gradient">
        <h2>Approved Sellers</h2>
        <p className="number">{stats.approvedSellers}</p>
      </div>

      <div className="card soft">
        <h2>Pending Sellers</h2>
        <p className="number">{stats.pendingSellers}</p>
      </div>

      <div className="card rejected">
        <h2>Rejected Sellers</h2>
        <p className="number">{stats.rejectedSellers}</p>
      </div>

      <div className="card buyers">
        <h2>Total Buyers</h2>
        <p className="number">{stats.totalBuyers}</p>
      </div>
    </div>
  );
}

export default Cards;
