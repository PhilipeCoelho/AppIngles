"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  const [dueCount, setDueCount] = useState(0);

  async function loadWords() {
    const res = await fetch("/api/words");
    const data = await res.json();
    setWords(data.words);
    const now = Date.now();
    setDueCount(
      data.words.filter((w: WordRow) => new Date(w.due_at + "Z").getTime() <= now)
        .length
    );
  }

  useEffect(() => {
    loadWords();
  }, []);

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
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          AppInglês
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Cadastre palavras novas do seu curso de inglês. O sistema traz elas
          de volta, dentro de frases diferentes, no tempo certo da sua curva
          de aprendizado, para você não esquecer.
        </p>

        <Link
          href="/review"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-black dark:bg-white text-white dark:text-black px-5 py-3 font-medium hover:opacity-90"
        >
          Revisar agora {dueCount > 0 && `(${dueCount})`}
        </Link>

        <form
          onSubmit={addWord}
          className="mt-10 flex flex-col gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900"
        >
          <h2 className="font-medium text-black dark:text-zinc-50">
            Nova palavra
          </h2>
          <input
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-black dark:text-zinc-50"
            placeholder="Palavra em inglês (ex: water)"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <input
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-black dark:text-zinc-50"
            placeholder="Tradução (ex: água)"
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="self-start rounded-full bg-black dark:bg-white text-white dark:text-black px-5 py-2 font-medium disabled:opacity-50"
          >
            Adicionar
          </button>
        </form>

        <div className="mt-10">
          <h2 className="font-medium text-black dark:text-zinc-50 mb-3">
            Suas palavras ({words.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {words.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2 bg-white dark:bg-zinc-900"
              >
                <span className="text-black dark:text-zinc-50">
                  <strong>{w.term}</strong> — {w.translation}
                </span>
                <span className="text-xs text-zinc-500">
                  {w.repetitions === 0
                    ? "novo"
                    : `revisado ${w.repetitions}x`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
