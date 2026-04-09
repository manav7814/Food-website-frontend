import { useState } from "react";
import "./UserCard.css";

/**
 * UserCard - A professional React component to display user information
 * with expandable address functionality
 */
export default function UserCard({ user }) {
  const [showFullAddress, setShowFullAddress] = useState(false);

  const toggleAddress = () => {
    setShowFullAddress(!showFullAddress);
  };

  // Default sample data if no user prop provided
  const defaultUser = {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    address: "123 Main Street, Apt 4B, New York, NY 10001, United States of America"
  };

  const currentUser = user || defaultUser;

  return (
    <div className="user-card">
      <div className="user-card-header">
        <div className="user-avatar">
          {currentUser.name.charAt(0).toUpperCase()}
        </div>
        <div className="user-card-title">
          <h3 className="user-name">{currentUser.name}</h3>
          <span className="user-label">User Profile</span>
        </div>
      </div>

      <div className="user-card-body">
        <div className="user-info-row">
          <span className="user-info-icon">✉</span>
          <a href={`mailto:${currentUser.email}`} className="user-info-link">
            {currentUser.email}
          </a>
        </div>

        <div className="user-info-row">
          <span className="user-info-icon">☎</span>
          <a href={`tel:${currentUser.phone}`} className="user-info-link">
            {currentUser.phone}
          </a>
        </div>

        <div className="user-info-row">
          <span className="user-info-icon">⌖</span>
          <div className="user-address-container">
            <p className={`user-address ${showFullAddress ? "expanded" : "collapsed"}`}>
              {currentUser.address}
            </p>
            {currentUser.address.length > 50 && (
              <button 
                className="user-address-toggle"
                onClick={toggleAddress}
                aria-expanded={showFullAddress}
              >
                {showFullAddress ? "Show Less" : "Show More"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="user-card-footer">
        <button className="user-card-action">
          View Details
        </button>
      </div>
    </div>
  );
}
