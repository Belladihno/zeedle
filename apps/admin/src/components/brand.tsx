export function Icon({ name, size = 20, filled = false }: { name: string; size?: number; filled?: boolean }) {
  return (
    <span
      className="material-symbols-outlined shrink-0"
      style={{
        fontSize: size,
        fontVariationSettings: filled ? "'FILL' 1" : undefined,
      }}
      aria-hidden
    >
      {name}
    </span>
  );
}

export function Logo({ height = 28 }: { height?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32" fill="none" height={height} aria-label="Zeedle">
      <rect x="2" y="4" width="24" height="24" rx="6" fill="#5B6EF5" />
      <path
        d="M8 10H20L10 22H20"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="34"
        y="22"
        fill="#F4F4F6"
        fontFamily="Inter, sans-serif"
        fontSize="18"
        fontWeight="700"
        letterSpacing="-0.02em"
      >
        zeedle
      </text>
    </svg>
  );
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
