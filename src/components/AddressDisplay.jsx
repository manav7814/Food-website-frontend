import { useState } from "react";

/**
 * AddressDisplay - A reusable component to display addresses with "Show More"/"Show Less" toggle
 * @param {string} address - The address to display
 * @param {number} maxLength - Character limit before showing toggle (default: 50)
 */
export default function AddressDisplay({ address, maxLength = 50 }) {
  const [showFull, setShowFull] = useState(false);

  if (!address) return null;

  const isLong = address.length > maxLength;
  const displayAddress = showFull || !isLong ? address : `${address.substring(0, maxLength)}...`;

  return (
    <span className="address-display">
      {displayAddress}
      {isLong && (
        <button
          type="button"
          className="address-toggle"
          onClick={() => setShowFull(!showFull)}
          style={{
            background: "none",
            border: "none",
            padding: "0",
            marginLeft: "4px",
            color: "var(--accent-color, #d94818)",
            cursor: "pointer",
            fontSize: "inherit",
            fontWeight: "500"
          }}
        >
          {showFull ? "Show Less" : "Show More"}
        </button>
      )}
    </span>
  );
}
