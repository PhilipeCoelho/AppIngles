"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";

interface WordRow {
  id: number;
  term: string;
  translation: string;
  due_at: string;
  repetitions: number;
  interval_days: number;
}

export default function Home() {
  const [words, setWords] = useState<WordRow[]>([]);
  const [term, setTerm] = useState("");
  const [translation, setTranslation] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function loadWords() {
    const res = await fetch("/api/words");
    const data = await res.json();
    setWords(data.words);
    setLoaded(true);
  }

  useEffect(() => {
    loadWords();
  }, []);

  const { dueCount, learnedCount } = useMemo(() => {
    const now = Date.now();
    return {
      dueCount: words.filter((w) => new Date(w.due_at + "Z").getTime() <= now)
        .length,
      learnedCount: words.filter((w) => w.repetitions >= 3).length,
    };
  }, [words]);

  async function addWord(e: React.FormEvent) {
    e.preventDefault();
    if (!term.trim() || !translation.trim()) return;
    setLoading(true);
    await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term, translation }),
    });
    setTerm("");
    setTranslation("");
    setLoading(false);
    loadWords();
  }

  return (
    <div className="flex min-h-screen flex-col font-sans">
      <Header active="home" />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Palavras" value={words.length} />
          <StatCard label="Para revisar" value={dueCount} accent="amber" />
          <StatCard label="Fixadas" value={learnedCount} accent="emerald" />
        </div>

        {dueCount > 0 && (
          <a
            href="/review"
            className="mt-5 flex items-center justify-between rounded-2xl bg-indigo-600 px-5 py-4 text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500"
          >
            <span className="font-medium">
              {dueCount} palavra{dueCount > 1 ? "s" : ""} pronta
              {dueCount > 1 ? "s" : ""} para revisar agora
            </span>
            <span aria-hidden>→</span>
          </a>
        )}

        <form
          onSubmit={addWord}
          className="mt-8 flex flex-col gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm"
        >
          <div>
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-50">
              Adicionar palavra nova
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Ela entra na fila e volta em frases diferentes, no tempo certo
              para você não esquecer.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3.5 py-2.5 text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Palavra em inglês · ex: water"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <input
              className="flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent px-3.5 py-2.5 text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Tradução · ex: água"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !term.trim() || !translation.trim()}
            className="self-start rounded-full bg-neutral-900 dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-neutral-900 transition hover:opacity-90 disabled:opacity-40"
          >
            {loading ? "Adicionando..." : "Adicionar"}
          </button>
        </form>

        <div className="mt-10">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
            Suas palavras
          </h2>

          {loaded && words.length === 0 && (
            <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 px-6 py-10 text-center text-neutral-500">
              Nenhuma palavra ainda. Adicione a primeira acima para começar.
            </div>
          )}

          <ul className="flex flex-col gap-2">
            {words.map((w) => {
              const isDue = new Date(w.due_at + "Z").getTime() <= Date.now();
              return (
                <li
                  key={w.id}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3"
                >
                  <div>
                    <span className="font-medium text-neutral-900 dark:text-neutral-50">
                      {w.term}
                    </span>
                    <span className="text-neutral-400"> · </span>
                    <span className="text-neutral-600 dark:text-neutral-400">
                      {w.translation}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      isDue
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        : w.repetitions === 0
                          ? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    }`}
                  >
                    {isDue
                      ? "pronta para revisar"
                      : w.repetitions === 0
                        ? "nova"
                        : `revisada ${w.repetitions}x`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = "neutral",
}: {
  label: string;
  value: number;
  accent?: "neutral" | "amber" | "emerald";
}) {
  const accentClass = {
    neutral: "text-neutral-900 dark:text-neutral-50",
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
  }[accent];

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3.5">
      <p className={`text-2xl font-semibold ${accentClass}`}>{value}</p>
      <p className="mt-0.5 text-xs text-neutral-500">{label}</p>
    </div>
  );
}
