import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY não configurada nas variáveis de ambiente"
    );
  }
  if (!client) client = new Anthropic();
  return client;
}

export async function generatePhrase(
  term: string,
  translation: string,
  previousPhrases: string[]
): Promise<string> {
  const avoidList =
    previousPhrases.length > 0
      ? `Frases já usadas para esta palavra, NÃO repita o mesmo contexto ou estrutura delas:\n${previousPhrases
          .map((p) => `- ${p}`)
          .join("\n")}`
      : "Nenhuma frase anterior ainda.";

  const message = await getClient().messages.create({
    model: "claude-sonnet-5",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: `Você ajuda um estudante brasileiro a praticar inglês.
Gere UMA frase curta em inglês (5 a 12 palavras), natural e falada no dia a dia, usando obrigatoriamente a palavra "${term}" (tradução em português: "${translation}").

${avoidList}

A nova frase deve usar um contexto e estrutura diferentes dos anteriores.
Responda APENAS com a frase em inglês, sem aspas, sem tradução, sem explicações.`,
      },
    ],
  });

  const block = message.content[0];
  const text = block.type === "text" ? block.text.trim() : term;
  return text.replace(/^["']|["']$/g, "");
}
