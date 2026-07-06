"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

interface ReviewCard {
  done: boolean;
  cardId?: number;
  term?: string;
  translation?: string;
  phrase?: string;
}

interface CorrectionResult {
  correct: boolean;
  feedback: string;
  mistakes: { word: string; translation: string }[];
  requeued: string[];
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
  const [correction, setCorrection] = useState<CorrectionResult | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [grading, setGrading] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
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
    setCorrection(null);
    const res = await fetch("/api/review/next");
    const data = await res.json();
    setCard(data);
    setLoading(false);
  }

  function speakPhrase() {
    if (!card?.phrase) return;
    const utterance = new SpeechSynthesisUtterance(card.phrase);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
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
      runCorrection(transcript);
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);

    recognitionRef.current = recognition;
    setRecording(true);
    recognition.start();
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setRecording(false);
  }

  async function runCorrection(transcript: string) {
    if (!card?.phrase || !card?.term) return;
    setCorrecting(true);
    const res = await fetch("/api/review/correct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phrase: card.phrase,
        spokenText: transcript,
        term: card.term,
      }),
    });
    const data = await res.json();
    setCorrection(data);
    setCorrecting(false);
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

        {!loading && card?.done && (
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

        {!loading && !card?.done && card && (
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                {card.term} · {card.translation}
              </span>
              <p className="mt-4 text-2xl font-medium leading-snug text-neutral-900 dark:text-neutral-50">
                {card.phrase}
              </p>
              <button
                onClick={speakPhrase}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-900 dark:text-neutral-50 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                🔊 Ouvir frase
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
                disabled={correcting}
                className={`inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white transition disabled:opacity-40 ${
                  recording
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-indigo-600 hover:bg-indigo-500"
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

            {correcting && (
              <p className="text-sm text-neutral-500">Corrigindo...</p>
            )}

            {correction && (
              <div
                className={`rounded-xl border p-4 text-sm ${
                  correction.correct
                    ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950"
                    : "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950"
                }`}
              >
                <p className="text-neutral-900 dark:text-neutral-50">
                  {correction.correct ? "✅ " : "✏️ "}
                  {correction.feedback}
                </p>
                {correction.requeued.length > 0 && (
                  <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                    Voltaram para o aprendizado:{" "}
                    <strong>{correction.requeued.join(", ")}</strong>
                  </p>
                )}
              </div>
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
