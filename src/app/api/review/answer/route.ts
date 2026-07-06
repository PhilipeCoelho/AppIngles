import { NextRequest, NextResponse } from "next/server";
import { db, withSchema } from "@/lib/db";
import { sm2Next } from "@/lib/sm2";

export async function POST(req: NextRequest) {
  await withSchema();
  const body = await req.json();
  const cardId = Number(body.cardId);
  const quality = Number(body.quality);

  if (!cardId || Number.isNaN(quality)) {
    return NextResponse.json(
      { error: "cardId e quality são obrigatórios" },
      { status: 400 }
    );
  }

  const cardResult = await db.execute({
    sql: "SELECT ease_factor, interval_days, repetitions FROM cards WHERE id = ?",
    args: [cardId],
  });
  const card = cardResult.rows[0];

  if (!card) {
    return NextResponse.json({ error: "card não encontrado" }, { status: 404 });
  }

  const result = sm2Next(
    {
      easeFactor: card.ease_factor as number,
      intervalDays: card.interval_days as number,
      repetitions: card.repetitions as number,
    },
    quality
  );

  await db.execute({
    sql: `UPDATE cards
          SET ease_factor = ?, interval_days = ?, repetitions = ?,
              due_at = datetime('now', ?), last_reviewed_at = datetime('now')
          WHERE id = ?`,
    args: [
      result.easeFactor,
      result.intervalDays,
      result.repetitions,
      `+${result.dueInDays} days`,
      cardId,
    ],
  });

  return NextResponse.json({ ok: true, nextDueInDays: result.dueInDays });
}
