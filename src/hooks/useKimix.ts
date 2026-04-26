import { useCallback, useRef } from "react";
import {
  createSession,
  deleteSession,
  sendPromptAsync,
  abortSession,
  type SessionInfo,
} from "@/api/kimixClient";
import { useKimixSSE, type KimixEvent } from "@/hooks/useKimixSSE";

export interface KimixMessageDelta {
  text: string;
  done: boolean;
  messageID?: string;
}

export interface KimixSession extends SessionInfo {
  isProcessing: boolean;
}

// ── Hook ────────────────────────────────────────────────────────

export function useKimix() {
  const { connectionState, subscribe } = useKimixSSE();
  const activeMessages = useRef<Set<string>>(new Set());

  const openSession = useCallback(async (title?: string): Promise<string> => {
    const info = await createSession(title);
    return info.id;
  }, []);

  const closeSession = useCallback(async (sessionId: string): Promise<void> => {
    await deleteSession(sessionId);
  }, []);

  const sendMessage = useCallback(
    async (
      sessionId: string,
      text: string,
      onDelta: (delta: KimixMessageDelta) => void,
      agent?: string
    ): Promise<void> => {
      return new Promise((resolve, reject) => {
        let resolved = false;
        let currentMessageId = "";

        const handleEvent = (event: KimixEvent) => {
          const props = event.properties;
          const evtSessionId = props.sessionID as string;
          if (evtSessionId !== sessionId) return;

          switch (event.type) {
            case "message.part.updated": {
              const part = props.part as Record<string, unknown> | undefined;
              if (!part) return;
              const messageID = (part.messageID as string) || "";
              if (messageID) {
                currentMessageId = messageID;
              }

              if (part.type === "text") {
                const delta = (props.delta as string) || "";
                const fullText = (part.text as string) || "";
                onDelta({
                  text: delta || fullText,
                  done: false,
                  messageID: currentMessageId,
                });
              }
              break;
            }

            case "message.updated": {
              onDelta({ text: "", done: true, messageID: currentMessageId });
              if (!resolved) {
                resolved = true;
                cleanup();
                resolve();
              }
              break;
            }

            case "session.idle": {
              onDelta({ text: "", done: true, messageID: currentMessageId });
              if (!resolved) {
                resolved = true;
                cleanup();
                resolve();
              }
              break;
            }

            case "session.status": {
              const status = props.status as Record<string, unknown> | undefined;
              if (status?.type === "error" && !resolved) {
                resolved = true;
                cleanup();
                reject(new Error("Session error"));
              }
              break;
            }
          }
        };

        const cleanup = subscribe(sessionId, handleEvent);
        activeMessages.current.add(sessionId);

        sendPromptAsync(sessionId, text, agent).catch((err) => {
          activeMessages.current.delete(sessionId);
          if (!resolved) {
            resolved = true;
            cleanup();
            reject(err);
          }
        });
      });
    },
    [subscribe]
  );

  const abort = useCallback(async (sessionId: string): Promise<void> => {
    await abortSession(sessionId);
    activeMessages.current.delete(sessionId);
  }, []);

  return {
    connectionState,
    openSession,
    closeSession,
    sendMessage,
    abort,
  };
}
