"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <main className="mx-auto max-w-xl px-6 py-12">
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← voltar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-black dark:text-zinc-50">
          Revisão
        </h1>

        {loading && <p className="mt-6 text-zinc-500">Carregando...</p>}

        {!loading && card?.done && (
          <p className="mt-6 text-zinc-600 dark:text-zinc-400">
            Nenhuma palavra pendente agora. Volte mais tarde, dentro da sua
            curva de aprendizado.
          </p>
        )}

        {!loading && !card?.done && card && (
          <div className="mt-6 flex flex-col gap-5">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
              <p className="text-sm text-zinc-500">
                {card.term} — {card.translation}
              </p>
              <p className="mt-2 text-xl font-medium text-black dark:text-zinc-50">
                {card.phrase}
              </p>
              <button
                onClick={speakPhrase}
                className="mt-4 rounded-full border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-black dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                🔊 Ouvir frase
              </button>
            </div>

            {!speechSupported && (
              <p className="text-sm text-amber-600">
                Seu navegador não suporta reconhecimento de voz. Use o Chrome
                para gravar sua fala.
              </p>
            )}

            {speechSupported && (
              <button
                onClick={recording ? stopRecording : startRecording}
                disabled={correcting}
                className="self-start rounded-full bg-black dark:bg-white text-white dark:text-black px-5 py-2 font-medium disabled:opacity-50"
              >
                {recording ? "⏹ Parar" : "🎙 Repetir a frase em voz alta"}
              </button>
            )}

            {spokenText && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Você disse: <em>&ldquo;{spokenText}&rdquo;</em>
              </p>
            )}

            {correcting && <p className="text-sm text-zinc-500">Corrigindo...</p>}

            {correction && (
              <div
                className={`rounded-xl border p-4 text-sm ${
                  correction.correct
                    ? "border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-800"
                    : "border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800"
                }`}
              >
                <p className="text-black dark:text-zinc-50">
                  {correction.feedback}
                </p>
                {correction.requeued.length > 0 && (
                  <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                    Palavras que voltaram para o aprendizado:{" "}
                    <strong>{correction.requeued.join(", ")}</strong>
                  </p>
                )}
              </div>
            )}

            <div className="mt-2">
              <p className="text-sm text-zinc-500 mb-2">
                Como foi com &ldquo;{card.term}&rdquo;?
              </p>
              <div className="flex gap-2">
                <button
                  disabled={grading}
                  onClick={() => grade(1)}
                  className="rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Não sabia
                </button>
                <button
                  disabled={grading}
                  onClick={() => grade(3)}
                  className="rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Foi difícil
                </button>
                <button
                  disabled={grading}
                  onClick={() => grade(5)}
                  className="rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
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
