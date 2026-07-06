import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generatePhrase } from "@/lib/phrase";

interface DueCard {
  card_id: number;
  word_id: number;
  term: string;
  translation: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
}

export async function GET() {
  const card = db
    .prepare(
      `SELECT c.id as card_id, c.word_id, w.term, w.translation,
              c.ease_factor, c.interval_days, c.repetitions
       FROM cards c
       JOIN words w ON w.id = c.word_id
       WHERE c.due_at <= datetime('now')
       ORDER BY c.due_at ASC
       LIMIT 1`
    )
    .get() as DueCard | undefined;

  if (!card) {
    return NextResponse.json({ done: true });
  }

  const previousPhrases = (
    db
      .prepare(
        "SELECT phrase FROM phrase_history WHERE word_id = ? ORDER BY created_at DESC LIMIT 10"
      )
      .all(card.word_id) as { phrase: string }[]
  ).map((r) => r.phrase);

  const phrase = await generatePhrase(
    card.term,
    card.translation,
    previousPhrases
  );

  db.prepare(
    "INSERT INTO phrase_history (word_id, phrase) VALUES (?, ?)"
  ).run(card.word_id, phrase);

  return NextResponse.json({
    done: false,
    cardId: card.card_id,
    term: card.term,
    translation: card.translation,
    phrase,
    repetitions: card.repetitions,
  });
}
