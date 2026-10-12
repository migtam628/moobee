/** Full-screen spinner shown while the first route chunk loads. */
export function PageLoader() {
  return (
    <div
      role="status"
      aria-label="Loading MooBee"
      className="grid min-h-dvh place-items-center bg-canvas"
    >
      <div
        aria-hidden="true"
        className="size-9 animate-spin rounded-full border-2 border-white/15 border-t-accent"
      />
    </div>
  );
}
