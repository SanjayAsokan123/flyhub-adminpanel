import "../styles/Activity.css";

function Activity() {
  return (
    <div className="activity">
      <h2>Recent Activity</h2>
      <ul>
        <li>✔️ John added a new project</li>
        <li>👤 New user registered</li>
        <li>💰 Payment received - $250</li>
        <li>⚠️ Server downtime reported</li>
      </ul>
    </div>
  );
}

export default Activity;
