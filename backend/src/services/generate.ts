import fs from "fs";
import { extractTextFromPDF } from "../utils/pdf";

const ollamaUrl = "http://localhost:11434";
const model = "mistral";

export async function streamGenerateFromFile(
  filePath: string,
  onToken: (token: string) => void,
  onDone: () => void
): Promise<void> {
  const text = await extractTextFromPDF(filePath);
  fs.unlinkSync(filePath);

  const prompt = `Tu es un assistant spécialisé dans la synthèse de cours. Retourne un résumé clair et structuré avec des titres et des points clés.\n\nTexte à résumer :\n${text}`;

  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: true }),
  });

  if (!res.ok || !res.body) throw new Error("Ollama unreachable");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines.filter(Boolean)) {
      try {
        const json = JSON.parse(line);
        if (json.response) onToken(json.response);
        if (json.done) onDone();
      } catch {
        // ligne malformée, ignorée silencieusement
      }
    }
  }
}
