// Pyramid Backstage mark — the exact artwork lives in /public/logo.svg.
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.svg"
      width={size}
      height={size}
      alt="Pyramid Backstage"
      className={className}
      style={{ objectFit: 'contain' }}
      draggable={false}
    />
  );
}
