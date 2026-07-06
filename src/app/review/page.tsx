"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

interface ReviewCard {
  done: boolean;
  cardId?: number;
  term?: string;
  translation?: string;
}

// SpeechRecognition isn't in the standard DOM lib types yet.
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

export default function ReviewPage() {
  const [card, setCard] = useState<ReviewCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [grading, setGrading] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    setSpeechSupported(Boolean(Ctor));
    loadNext();
  }, []);

  async function loadNext() {
    setLoading(true);
    setSpokenText("");
    setError(null);
    try {
      const res = await fetch("/api/review/next");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao carregar a próxima revisão");
        setCard(null);
        return;
      }
      setCard(data);
    } catch {
      setError("Não foi possível conectar ao servidor");
      setCard(null);
    } finally {
      setLoading(false);
    }
  }

  function speakWord() {
    if (!card?.term) return;
    const utterance = new SpeechSynthesisUtterance(card.term);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function startRecording() {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string;
      setSpokenText(transcript);
      setRecording(false);
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);

    recognitionRef.current = recognition;
    setSpokenText("");
    setRecording(true);
    recognition.start();
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setRecording(false);
  }

  async function grade(quality: number) {
    if (!card?.cardId) return;
    setGrading(true);
    await fetch("/api/review/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: card.cardId, quality }),
    });
    setGrading(false);
    loadNext();
  }

  return (
    <div className="flex min-h-screen flex-col font-sans">
      <Header active="review" />

      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
        {loading && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="h-40 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-900" />
            <div className="h-10 w-48 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-900" />
          </div>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-6 py-6">
            <p className="font-medium text-red-700 dark:text-red-300">
              Não deu para carregar a revisão
            </p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
            <button
              onClick={loadNext}
              className="mt-4 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
            >
              Tentar de novo
            </button>
          </div>
        )}

        {!loading && !error && card?.done && (
          <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 px-6 py-14 text-center">
            <p className="text-3xl">✅</p>
            <p className="mt-3 font-medium text-neutral-900 dark:text-neutral-50">
              Tudo revisado por agora
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Volte mais tarde — o sistema traz suas palavras de volta no
              tempo certo da curva de aprendizado.
            </p>
            <Link
              href="/"
              className="mt-5 inline-block rounded-full bg-neutral-900 dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-neutral-900"
            >
              Voltar para palavras
            </Link>
          </div>
        )}

        {!loading && !error && !card?.done && card && (
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center shadow-sm">
              <p className="text-sm text-neutral-500">{card.translation}</p>
              <p className="mt-3 text-4xl font-semibold text-neutral-900 dark:text-neutral-50">
                {card.term}
              </p>
              <button
                onClick={speakWord}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
              >
                🔊 Ouvir a palavra
              </button>
            </div>

            {!speechSupported && (
              <p className="rounded-xl bg-amber-50 dark:bg-amber-950 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                Seu navegador não suporta reconhecimento de voz. Use o Chrome
                para gravar sua fala.
              </p>
            )}

            {speechSupported && (
              <button
                onClick={recording ? stopRecording : startRecording}
                className={`inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white transition ${
                  recording
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-neutral-900 dark:bg-neutral-700 hover:opacity-90"
                }`}
              >
                {recording ? "⏹ Parar gravação" : "🎙 Repetir em voz alta"}
              </button>
            )}

            {spokenText && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Você disse: <em>&ldquo;{spokenText}&rdquo;</em>
              </p>
            )}

            <div className="mt-2 border-t border-neutral-200 dark:border-neutral-800 pt-5">
              <p className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Como foi com &ldquo;{card.term}&rdquo;?
              </p>
              <div className="flex gap-2">
                <button
                  disabled={grading}
                  onClick={() => grade(1)}
                  className="flex-1 rounded-xl bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 px-4 py-2.5 text-sm font-medium transition hover:bg-red-100 dark:hover:bg-red-900 disabled:opacity-40"
                >
                  Não sabia
                </button>
                <button
                  disabled={grading}
                  onClick={() => grade(3)}
                  className="flex-1 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-4 py-2.5 text-sm font-medium transition hover:bg-amber-100 dark:hover:bg-amber-900 disabled:opacity-40"
                >
                  Foi difícil
                </button>
                <button
                  disabled={grading}
                  onClick={() => grade(5)}
                  className="flex-1 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-4 py-2.5 text-sm font-medium transition hover:bg-emerald-100 dark:hover:bg-emerald-900 disabled:opacity-40"
                >
                  Sabia bem
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
