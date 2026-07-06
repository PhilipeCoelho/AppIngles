import { NextResponse } from "next/server";
import { db, withSchema } from "@/lib/db";
import { generatePhrase } from "@/lib/phrase";

export async function GET() {
  try {
    await withSchema();

    const dueResult = await db.execute(
      `SELECT c.id as card_id, c.word_id, w.term, w.translation,
              c.ease_factor, c.interval_days, c.repetitions
       FROM cards c
       JOIN words w ON w.id = c.word_id
       WHERE c.due_at <= datetime('now')
       ORDER BY c.due_at ASC
       LIMIT 1`
    );

    const card = dueResult.rows[0];
    if (!card) {
      return NextResponse.json({ done: true });
    }

    const historyResult = await db.execute({
      sql: "SELECT phrase FROM phrase_history WHERE word_id = ? ORDER BY created_at DESC LIMIT 10",
      args: [card.word_id as number],
    });
    const previousPhrases = historyResult.rows.map((r) => r.phrase as string);

    const phrase = await generatePhrase(
      card.term as string,
      card.translation as string,
      previousPhrases
    );

    await db.execute({
      sql: "INSERT INTO phrase_history (word_id, phrase) VALUES (?, ?)",
      args: [card.word_id as number, phrase],
    });

    return NextResponse.json({
      done: false,
      cardId: card.card_id,
      term: card.term,
      translation: card.translation,
      phrase,
      repetitions: card.repetitions,
    });
  } catch (err) {
    console.error("review/next failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
