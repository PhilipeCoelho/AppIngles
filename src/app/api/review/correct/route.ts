import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { correctSpokenPhrase } from "@/lib/correction";

export async function POST(req: NextRequest) {
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
  const findWord = db.prepare(
    "SELECT id FROM words WHERE lower(term) = lower(?)"
  );
  const insertWord = db.prepare(
    "INSERT INTO words (term, translation) VALUES (?, ?)"
  );
  const insertCard = db.prepare(
    "INSERT INTO cards (word_id, due_at) VALUES (?, datetime('now'))"
  );
  const resetCard = db.prepare(
    `UPDATE cards SET repetitions = 0, interval_days = 1, due_at = datetime('now')
     WHERE word_id = ?`
  );

  for (const mistake of result.mistakes) {
    const cleanTerm = mistake.word.trim();
    if (!cleanTerm || cleanTerm.toLowerCase() === term.toLowerCase()) continue;

    const existing = findWord.get(cleanTerm) as { id: number } | undefined;
    if (existing) {
      resetCard.run(existing.id);
    } else {
      const inserted = insertWord.run(
        cleanTerm,
        mistake.translation || ""
      );
      insertCard.run(inserted.lastInsertRowid);
    }
    requeued.push(cleanTerm);
  }

  return NextResponse.json({ ...result, requeued });
}
