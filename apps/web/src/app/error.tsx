'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch dynamically imported module')
  ) {
    if (typeof window !== 'undefined') window.location.reload();
    return null;
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-text-primary">Something went wrong</h1>
      <p className="text-sm text-text-secondary">Please try again.</p>
      <button type="button" className="btn-secondary max-w-xs" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
