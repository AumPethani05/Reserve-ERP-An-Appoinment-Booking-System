export default function Spinner({ size = 36, color = 'var(--color-primary)' }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size,
      border: `${Math.max(2, size / 12)}px solid var(--color-surface-container-high)`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  );
}

export function PageSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <Spinner size={40} />
    </div>
  );
}
