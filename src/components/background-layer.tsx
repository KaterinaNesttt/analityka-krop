export function BackgroundLayer() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_14%,color-mix(in_oklch,var(--color-primary)_18%,transparent),transparent_32%),radial-gradient(circle_at_82%_8%,color-mix(in_oklch,var(--color-warning)_12%,transparent),transparent_28%),linear-gradient(135deg,var(--color-background),color-mix(in_oklch,var(--color-background)_86%,var(--color-sidebar)))]"
    />
  );
}
