// SM-2 spaced repetition algorithm (SuperMemo 2), the standard behind
// Anki/SuperMemo scheduling. Quality is 0-5; below 3 resets the card.
export interface SM2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface SM2Result extends SM2State {
  dueInDays: number;
}

export function sm2Next(state: SM2State, quality: number): SM2Result {
  const q = Math.max(0, Math.min(5, quality));
  let { easeFactor, intervalDays, repetitions } = state;

  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
  }

  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  return { easeFactor, intervalDays, repetitions, dueInDays: intervalDays };
}
