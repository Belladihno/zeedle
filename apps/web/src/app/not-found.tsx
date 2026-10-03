import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-text-primary">Page not found</h1>
      <Link href="/dashboard" className="btn-secondary max-w-xs">
        Back to dashboard
      </Link>
    </main>
  );
}
