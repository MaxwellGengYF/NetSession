/**
 * HTTP client for the kimix serve API.
 * Base URL: http://127.0.0.1:4096
 */

const BASE_URL = import.meta.env.VITE_KIMIX_URL || "http://127.0.0.1:4096";

// ── Types ───────────────────────────────────────────────────────

export interface SessionInfo {
  id: string;
  title: string | null;
  createdAt: number;
  updatedAt: number;
  parentID: string | null;
}

export interface PromptPart {
  type: string;
  text: string;
}

export interface PromptInput {
  parts: PromptPart[];
  agent?: string;
  model?: string;
}

export interface MessageInfo {
  id: string;
  role: "user" | "assistant" | "system";
  sessionID: string;
  agent: string;
  createdAt: number;
}

export interface MessagePart {
  id: string;
  type: string;
  text?: string;
  tool?: string;
  state?: Record<string, unknown>;
  sessionID: string;
  messageID: string;
  createdAt: number;
}

export interface MessageWithParts {
  info: MessageInfo;
  parts: MessagePart[];
}

export interface SessionStatus {
  type: "idle" | "busy" | "error";
  time: number;
}

export interface HealthResponse {
  healthy: boolean;
  version: string;
}

// ── Helpers ─────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return (await response.json()) as T;
}

// ── API ─────────────────────────────────────────────────────────

export async function health(): Promise<HealthResponse> {
  return request<HealthResponse>("GET", "/global/health");
}

export async function createSession(title?: string): Promise<SessionInfo> {
  return request<SessionInfo>("POST", "/session", { title });
}

export async function listSessions(): Promise<SessionInfo[]> {
  return request<SessionInfo[]>("GET", "/session");
}

export async function getSession(sessionID: string): Promise<SessionInfo> {
  return request<SessionInfo>("GET", `/session/${encodeURIComponent(sessionID)}`);
}

export async function deleteSession(sessionID: string): Promise<boolean> {
  return request<boolean>("DELETE", `/session/${encodeURIComponent(sessionID)}`);
}

export async function getSessionStatus(): Promise<Record<string, SessionStatus>> {
  return request<Record<string, SessionStatus>>("GET", "/session/status");
}

export async function getMessages(
  sessionID: string,
  limit?: number
): Promise<MessageWithParts[]> {
  const qs = limit !== undefined ? `?limit=${limit}` : "";
  return request<MessageWithParts[]>(
    "GET",
    `/session/${encodeURIComponent(sessionID)}/message${qs}`
  );
}

export async function sendMessage(
  sessionID: string,
  text: string,
  agent?: string
): Promise<MessageWithParts> {
  const body: PromptInput = {
    parts: [{ type: "text", text }],
    agent,
  };
  return request<MessageWithParts>(
    "POST",
    `/session/${encodeURIComponent(sessionID)}/message`,
    body
  );
}

export async function sendPromptAsync(
  sessionID: string,
  text: string,
  agent?: string
): Promise<void> {
  const body: PromptInput = {
    parts: [{ type: "text", text }],
    agent,
  };
  return request<void>(
    "POST",
    `/session/${encodeURIComponent(sessionID)}/prompt_async`,
    body
  );
}

export async function abortSession(sessionID: string): Promise<boolean> {
  return request<boolean>("POST", `/session/${encodeURIComponent(sessionID)}/abort`);
}

// SSE endpoint URL (for EventSource)
export function getEventStreamUrl(): string {
  return `${BASE_URL}/event`;
}
