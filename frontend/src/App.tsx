import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Mode = "chat" | "generate";

function generateSessionId() {
  return crypto.randomUUID();
}

async function streamFile(
  file: File,
  onToken: (token: string) => void,
  onDone: () => void
) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("http://localhost:3000/generate", {
    method: "POST",
    body: formData,
  });

  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n").filter(Boolean)) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") { onDone(); continue; }
      try {
        const { token } = JSON.parse(data);
        onToken(token);
      } catch (err) {
        console.error("parse error:", err);
      }
    }
  }
}

async function streamChat(
  url: string,
  body: object,
  onToken: (token: string) => void,
  onDone: () => void
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n").filter(Boolean)) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") { onDone(); continue; }
      try {
        const { token } = JSON.parse(data);
        onToken(token);
      } catch (err) {
        console.error("parse error:", err);
      }
    }
  }
}

export default function App() {
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [summary, setSummary] = useState("");
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const sessionId = useRef<string>(generateSessionId());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, summary]);

  function switchMode(m: Mode) {
    setMode(m);
    setMessages([]);
    setSummary("");
    setInput("");
    setFile(null);
    sessionId.current = generateSessionId();
  }

  async function submit() {
    if (loading) return;
    setLoading(true);

    if (mode === "chat") {
      if (!input.trim()) { setLoading(false); return; }
      const userMessage: Message = { role: "user", content: input };
      setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
      setInput("");

      try {
        await streamChat(
          "http://localhost:3000/chat",
          { sessionId: sessionId.current, message: userMessage.content },
          (token) => setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: updated[updated.length - 1].content + token,
            };
            return updated;
          }),
          () => {}
        );
      } catch (err) {
        console.error("chat error:", err);
      } finally {
        setLoading(false);
      }
    } else {
      if (!file) { setLoading(false); return; }
      setSummary("");

      try {
        await streamFile(
          file,
          (token) => setSummary((prev) => prev + token),
          () => {}
        );
      } catch (err) {
        console.error("generate error:", err);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: 720, margin: "0 auto", fontFamily: "sans-serif" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, flex: 1 }}>IA Locale</h1>
        <button
          onClick={() => switchMode("chat")}
          style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: mode === "chat" ? "#0070f3" : "#eee", color: mode === "chat" ? "#fff" : "#000" }}
        >
          Professeur
        </button>
        <button
          onClick={() => switchMode("generate")}
          style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: mode === "generate" ? "#0070f3" : "#eee", color: mode === "generate" ? "#fff" : "#000" }}
        >
          Résumé
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        {mode === "chat" && messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 16 }}>
            <div style={{
              maxWidth: "75%", padding: "10px 14px", borderRadius: 12,
              background: msg.role === "user" ? "#0070f3" : "#f1f1f1",
              color: msg.role === "user" ? "#fff" : "#000",
              lineHeight: 1.6, whiteSpace: "pre-wrap",
            }}>
              {msg.content || "..."}
            </div>
          </div>
        ))}

        {mode === "generate" && summary && (
          <div style={{ lineHeight: 1.8, whiteSpace: "pre-wrap", color: "#000" }}>
            {summary}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "16px 24px", borderTop: "1px solid #eee", display: "flex", gap: 8, alignItems: "center" }}>
        {mode === "chat" ? (
          <input
            style={{ flex: 1, padding: "10px 14px", fontSize: 15, borderRadius: 8, border: "1px solid #ddd" }}
            type="text"
            placeholder="Pose ta question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            disabled={loading}
          />
        ) : (
          <input
            style={{ flex: 1, padding: "10px 14px", fontSize: 15, borderRadius: 8, border: "1px solid #ddd" }}
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={loading}
          />
        )}
        <button
          style={{ padding: "10px 20px", fontSize: 15, borderRadius: 8, background: "#0070f3", color: "#fff", border: "none", cursor: "pointer" }}
          onClick={submit}
          disabled={loading || (mode === "generate" && !file)}
        >
          {loading ? "..." : mode === "chat" ? "Envoyer" : "Résumer"}
        </button>
      </div>
    </div>
  );
}
