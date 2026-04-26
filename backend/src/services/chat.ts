const ollamaUrl = "http://localhost:11434";
const model = "mistral";

export type Message = { role: "user" | "assistant" | "system"; content: string };

const systemPrompt: Message = {
  role: "system",
  content:
    "Tu es un professeur pédagogue et bienveillant. Tu expliques les concepts clairement, avec des exemples concrets. Tu poses parfois des questions pour vérifier la compréhension de l'élève.",
};

export async function streamChat(
  messages: Message[],
  onToken: (token: string) => void,
  onDone: () => void
): Promise<void> {
  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [systemPrompt, ...messages], stream: true }),
  });

  if (!res.ok || !res.body) throw new Error("Ollama unreachable");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n").filter(Boolean)) {
      try {
        const json = JSON.parse(line);
        if (json.message?.content) onToken(json.message.content);
        if (json.done) onDone();
      } catch (err) {
        console.error("[chat] parse error:", err);
      }
    }
  }
}
