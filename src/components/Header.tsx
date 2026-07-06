import Link from "next/link";

export function Header({ active }: { active: "home" | "review" }) {
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200/70 dark:border-neutral-800/70 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50"
        >
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-sm text-white">
            Ai
          </span>
          AppInglês
        </Link>
        <nav className="flex items-center gap-1 rounded-full bg-neutral-200/70 dark:bg-neutral-900 p-1 text-sm font-medium">
          <Link
            href="/"
            className={`rounded-full px-3 py-1.5 transition-colors ${
              active === "home"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 shadow-sm"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            Palavras
          </Link>
          <Link
            href="/review"
            className={`rounded-full px-3 py-1.5 transition-colors ${
              active === "review"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 shadow-sm"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            Revisar
          </Link>
        </nav>
      </div>
    </header>
  );
}
