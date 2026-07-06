import { NextRequest, NextResponse } from "next/server";
import { db, withSchema } from "@/lib/db";
import { correctSpokenPhrase } from "@/lib/correction";

export async function POST(req: NextRequest) {
  await withSchema();
  const body = await req.json();
  const phrase = String(body.phrase ?? "").trim();
  const spokenText = String(body.spokenText ?? "").trim();
  const term = String(body.term ?? "").trim();

  if (!phrase || !spokenText || !term) {
    return NextResponse.json(
      { error: "phrase, spokenText e term são obrigatórios" },
      { status: 400 }
    );
  }

  const result = await correctSpokenPhrase(phrase, spokenText, term);

  const requeued: string[] = [];

  for (const mistake of result.mistakes) {
    const cleanTerm = mistake.word.trim();
    if (!cleanTerm || cleanTerm.toLowerCase() === term.toLowerCase()) continue;

    const existingResult = await db.execute({
      sql: "SELECT id FROM words WHERE lower(term) = lower(?)",
      args: [cleanTerm],
    });
    const existing = existingResult.rows[0];

    if (existing) {
      await db.execute({
        sql: `UPDATE cards SET repetitions = 0, interval_days = 1, due_at = datetime('now')
              WHERE word_id = ?`,
        args: [existing.id as number],
      });
    } else {
      const inserted = await db.execute({
        sql: "INSERT INTO words (term, translation) VALUES (?, ?)",
        args: [cleanTerm, mistake.translation || ""],
      });
      await db.execute({
        sql: "INSERT INTO cards (word_id, due_at) VALUES (?, datetime('now'))",
        args: [inserted.lastInsertRowid!],
      });
    }
    requeued.push(cleanTerm);
  }

  return NextResponse.json({ ...result, requeued });
}
