import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-text-secondary">This console route does not exist.</p>
      <Link href="/overview" className="btn-secondary max-w-xs">
        Back to overview
      </Link>
    </main>
  );
}
