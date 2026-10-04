'use client';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold">Console error</h1>
      <p className="max-w-md text-sm text-text-secondary">
        {error.message || 'Something went wrong in the operations console.'}
      </p>
      <button type="button" onClick={reset} className="btn-secondary max-w-xs">
        Try again
      </button>
    </main>
  );
}
