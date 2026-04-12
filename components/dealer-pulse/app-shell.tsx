import Link from "next/link";

export function AppShell({
  children,
  title,
  subtitle,
  breadcrumbs,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  breadcrumbs?: { href?: string; label: string }[];
}) {
  return (
    <div className="min-h-full bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-teal-800 dark:text-teal-400"
            >
              DealerPulse
            </Link>
            <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
              Performance for your dealership network — targets, pipeline, and
              follow-ups.
            </p>
          </div>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="text-sm">
              <ol className="flex flex-wrap items-center gap-2">
                {breadcrumbs.map((b, i) => (
                  <li key={`${b.label}-${i}`} className="flex items-center gap-2">
                    {i > 0 && (
                      <span className="text-zinc-400" aria-hidden>
                        /
                      </span>
                    )}
                    {b.href ? (
                      <Link
                        href={b.href}
                        className="text-teal-700 hover:underline dark:text-teal-400"
                      >
                        {b.label}
                      </Link>
                    ) : (
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {b.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
