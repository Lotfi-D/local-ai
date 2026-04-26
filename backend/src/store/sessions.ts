import { Message } from "../services/chat";

const sessions = new Map<string, Message[]>();

export function getHistory(sessionId: string): Message[] {
  return sessions.get(sessionId) ?? [];
}

export function addMessages(sessionId: string, messages: Message[]): void {
  const history = getHistory(sessionId);
  sessions.set(sessionId, [...history, ...messages]);
}

export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}
