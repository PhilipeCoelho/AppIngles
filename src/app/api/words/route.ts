import { NextRequest, NextResponse } from "next/server";
import { db, withSchema } from "@/lib/db";

export async function GET() {
  try {
    await withSchema();
    const result = await db.execute(
      `SELECT w.id, w.term, w.translation, w.created_at,
              c.due_at, c.repetitions, c.interval_days
       FROM words w
       JOIN cards c ON c.word_id = w.id
       ORDER BY w.created_at DESC`
    );
    return NextResponse.json({ words: result.rows });
  } catch (err) {
    console.error("words GET failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await withSchema();
    const body = await req.json();
    const term = (body.term ?? "").trim();
    const translation = (body.translation ?? "").trim();

    if (!term || !translation) {
      return NextResponse.json(
        { error: "term e translation são obrigatórios" },
        { status: 400 }
      );
    }

    const existing = await db.execute({
      sql: "SELECT id FROM words WHERE term = ? COLLATE NOCASE",
      args: [term],
    });
    if (existing.rows[0]) {
      return NextResponse.json(
        { error: `"${term}" já está cadastrada` },
        { status: 409 }
      );
    }

    const insertResult = await db.execute({
      sql: "INSERT INTO words (term, translation) VALUES (?, ?)",
      args: [term, translation],
    });
    const wordId = insertResult.lastInsertRowid;

    await db.execute({
      sql: "INSERT INTO cards (word_id, due_at) VALUES (?, datetime('now'))",
      args: [wordId!],
    });

    return NextResponse.json(
      { id: Number(wordId), term, translation },
      { status: 201 }
    );
  } catch (err) {
    console.error("words POST failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
