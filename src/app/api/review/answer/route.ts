import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sm2Next } from "@/lib/sm2";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const cardId = Number(body.cardId);
  const quality = Number(body.quality);

  if (!cardId || Number.isNaN(quality)) {
    return NextResponse.json(
      { error: "cardId e quality são obrigatórios" },
      { status: 400 }
    );
  }

  const card = db
    .prepare(
      "SELECT ease_factor, interval_days, repetitions FROM cards WHERE id = ?"
    )
    .get(cardId) as
    | { ease_factor: number; interval_days: number; repetitions: number }
    | undefined;

  if (!card) {
    return NextResponse.json({ error: "card não encontrado" }, { status: 404 });
  }

  const result = sm2Next(
    {
      easeFactor: card.ease_factor,
      intervalDays: card.interval_days,
      repetitions: card.repetitions,
    },
    quality
  );

  db.prepare(
    `UPDATE cards
     SET ease_factor = ?, interval_days = ?, repetitions = ?,
         due_at = datetime('now', ?), last_reviewed_at = datetime('now')
     WHERE id = ?`
  ).run(
    result.easeFactor,
    result.intervalDays,
    result.repetitions,
    `+${result.dueInDays} days`,
    cardId
  );

  return NextResponse.json({ ok: true, nextDueInDays: result.dueInDays });
}
