import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const words = db
    .prepare(
      `SELECT w.id, w.term, w.translation, w.created_at,
              c.due_at, c.repetitions, c.interval_days
       FROM words w
       JOIN cards c ON c.word_id = w.id
       ORDER BY w.created_at DESC`
    )
    .all();
  return NextResponse.json({ words });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const term = (body.term ?? "").trim();
  const translation = (body.translation ?? "").trim();

  if (!term || !translation) {
    return NextResponse.json(
      { error: "term e translation são obrigatórios" },
      { status: 400 }
    );
  }

  const insertWord = db.prepare(
    "INSERT INTO words (term, translation) VALUES (?, ?)"
  );
  const result = insertWord.run(term, translation);
  const wordId = result.lastInsertRowid;

  db.prepare(
    "INSERT INTO cards (word_id, due_at) VALUES (?, datetime('now'))"
  ).run(wordId);

  return NextResponse.json({ id: wordId, term, translation }, { status: 201 });
}
