import express from "express";
import cors from "cors";
import chatRouter from "./routes/chat";
import generateRouter from "./routes/generate";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/chat", chatRouter);
app.use("/generate", generateRouter);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`  POST /chat      (SSE → Ollama /api/chat)`);
  console.log(`  POST /generate  (SSE → Ollama /api/generate)`);
});
