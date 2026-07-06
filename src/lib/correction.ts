import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface Mistake {
  word: string;
  translation: string;
}

export interface CorrectionResult {
  correct: boolean;
  feedback: string;
  mistakes: Mistake[];
}

// Compares what the student said against the target phrase. Mistakes on
// words other than the card's own term are surfaced so they can be
// re-queued into the learning system too.
export async function correctSpokenPhrase(
  expectedPhrase: string,
  spokenText: string,
  term: string
): Promise<CorrectionResult> {
  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Um estudante brasileiro de inglês devia falar esta frase:
"${expectedPhrase}"

O que foi reconhecido da fala dele (via reconhecimento de voz) foi:
"${spokenText}"

A palavra que ele está estudando nesta frase é "${term}" (não avalie erros nela separadamente, ela já é acompanhada por outro sistema).

Compare o que ele disse com a frase esperada e responda em JSON puro, sem markdown, no formato:
{
  "correct": boolean (true se a frase foi dita corretamente, ignorando pequenas variações de reconhecimento de voz),
  "feedback": "frase curta em português explicando o que errou ou confirmando que acertou",
  "mistakes": [ { "word": "palavra em inglês que ele errou, exceto '${term}'", "translation": "tradução em português dessa palavra" } ]
}
Se não houver erros além da própria palavra estudada, "mistakes" deve ser [].`,
      },
    ],
  });

  const block = message.content[0];
  const text = block.type === "text" ? block.text.trim() : "{}";
  const jsonText = text.replace(/^```json\s*|```$/g, "").trim();

  try {
    const parsed = JSON.parse(jsonText) as CorrectionResult;
    return {
      correct: Boolean(parsed.correct),
      feedback: parsed.feedback ?? "",
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
    };
  } catch {
    return { correct: false, feedback: text, mistakes: [] };
  }
}
