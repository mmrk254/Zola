export function ZolaLogo({ size = 18, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <span className="zola-logo" style={{ display: "inline-flex", alignItems: "center", gap: showText ? 9 : 0 }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#0F8D8A" />
        <path
          d="M10 34h9l4-10 6 20 5-14h20"
          stroke="#fff"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText ? "ZOLA" : null}
    </span>
  );
}
