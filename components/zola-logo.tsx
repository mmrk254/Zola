export function ZolaLogo({ size = 18, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <span className="zola-logo" style={{ display: "inline-flex", alignItems: "center", gap: showText ? 9 : 0 }}>
      <svg width={size} height={size} viewBox="0 0 132 132" fill="none" aria-hidden="true">
        <rect width="132" height="132" rx="28" fill="#0D918D" />
        <path d="M18 67h22l8-20 13 42 10-30h43" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {showText ? <span className="zola-logo-wordmark" style={{ fontSize: size * 0.75 }}>ZOLA</span> : null}
    </span>
  );
}
