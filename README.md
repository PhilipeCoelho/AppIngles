# AppInglês — Cards de repetição espaçada

Sistema de flashcards para vocabulário de inglês baseado em repetição
espaçada (algoritmo SM-2). Cada palavra nova volta para revisão dentro de
frases diferentes a cada vez, geradas por IA, para você praticar a palavra
em contextos variados em vez de decorar uma frase fixa.

## Como funciona

1. Cadastre uma palavra nova (ex: `water` → `água`) na tela inicial.
2. Ela entra imediatamente na fila de revisão.
3. Na tela de Revisão, o app monta uma frase nova em inglês usando a
   palavra (via API da Anthropic), diferente de qualquer frase já usada
   antes para aquela palavra.
4. Você ouve a frase (síntese de voz do navegador), repete em voz alta
   (o navegador grava e transcreve via reconhecimento de fala), e o
   sistema corrige a frase inteira — não só a palavra estudada.
5. Se você errar outras palavras da frase (não a palavra alvo), elas
   voltam automaticamente para a fila de aprendizado.
6. Você avalia como foi com a palavra alvo ("Não sabia" / "Foi difícil" /
   "Sabia bem"). Isso ajusta, pelo SM-2, quando essa palavra deve voltar:
   se você sabe bem, o intervalo cresce (menos revisões); se não sabe,
   ela volta a curto prazo.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha ANTHROPIC_API_KEY
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). O banco de dados é um
arquivo SQLite local em `data/appingles.db` (criado automaticamente).

Para gravação de voz e reconhecimento de fala (Web Speech API), use o
Chrome — outros navegadores têm suporte parcial ou nenhum.

## Stack

- Next.js (App Router) + TypeScript
- SQLite (`better-sqlite3`) — banco local em arquivo
- API da Anthropic (`@anthropic-ai/sdk`) — geração de frases variadas e
  correção da fala
- Web Speech API do navegador — texto-para-fala e fala-para-texto
- Algoritmo SM-2 — agendamento da curva de repetição espaçada
