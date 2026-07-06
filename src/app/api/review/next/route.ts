import { NextResponse } from "next/server";
import { db, withSchema } from "@/lib/db";

// Phase 1: review the word itself. Phase 2 will bring back AI-generated
// sentences (see lib/phrase.ts and phrase_history) once word review is solid.
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

    return NextResponse.json({
      done: false,
      cardId: card.card_id,
      term: card.term,
      translation: card.translation,
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
