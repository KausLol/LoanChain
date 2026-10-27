// Custom crisp icons for the LoanChain application

export function CubeLogo({ size = 24, color = "#111827" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

export function MetaMaskFox({ size = 22, className = "" }) {
  return (
    <img
      src="/metamask-fox.png"
      alt="MetaMask"
      width={size}
      height={size}
      className={className}
      style={{ display: "inline-block", objectFit: "contain", verticalAlign: "middle" }}
    />
  );
}
