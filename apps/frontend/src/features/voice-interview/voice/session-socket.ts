import { nextBackoffDelayMs } from "@workspace/interview-realtime/session-rules";
import { logInterview } from "#/features/voice-interview/interview-debug-log";

/** Close code the DO uses to supersede a connection opened in another tab. */
export const WS_CLOSE_SUPERSEDED = 4001;

const MAX_RECONNECT_ATTEMPTS = 5;

export interface SessionSocketHandlers {
  onMessage: (event: MessageEvent) => void;
  onOpen?: () => void;
  onClose?: (code: number, reason: string) => void;
  onReconnect?: (attempt: number) => void;
  /** Return false to stop reconnecting (e.g. session already ended). */
  canReconnect?: () => boolean;
}

/**
 * Browser WebSocket to the Interview Session DO with automatic reconnection.
 *
 * The DO restores full session state via the `CONNECTED` message on reattach,
 * so a dropped connection can be recovered without restarting the voice call.
 * Reconnects use exponential backoff; a close with code 4001 (superseded by
 * another tab) and intentional closes never reconnect.
 */
export class SessionSocket {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private readonly handlers: SessionSocketHandlers;
  private intentionalClose = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(url: string, handlers: SessionSocketHandlers) {
    this.url = url;
    this.handlers = handlers;
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  connect(): void {
    this.open();
  }

  private open(): void {
    if (this.intentionalClose) {
      return;
    }
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onmessage = (event) => this.handlers.onMessage(event);

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.handlers.onOpen?.();
    };

    ws.onclose = (event) => this.handleClose(event);

    ws.onerror = () => {
      logInterview.warn("ws", "ws_error", { url: this.url });
    };
  }

  private handleClose(event: CloseEvent): void {
    this.handlers.onClose?.(event.code, event.reason);

    if (this.intentionalClose) {
      return;
    }

    if (event.code === WS_CLOSE_SUPERSEDED) {
      logInterview.warn("ws", "ws_superseded_another_tab", {});
      this.intentionalClose = true;
      return;
    }

    if (this.handlers.canReconnect?.() === false) {
      return;
    }

    if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      logInterview.warn("ws", "ws_reconnect_exhausted", {
        attempts: this.reconnectAttempt,
        code: event.code,
      });
      return;
    }

    const attempt = this.reconnectAttempt + 1;
    this.reconnectAttempt = attempt;
    const delay = nextBackoffDelayMs(attempt - 1);
    logInterview.info("ws", "ws_reconnect_scheduled", {
      attempt,
      delayMs: delay,
      code: event.code,
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.intentionalClose) {
        return;
      }
      if (this.handlers.canReconnect?.() === false) {
        return;
      }
      this.open();
    }, delay);
    this.handlers.onReconnect?.(attempt);
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  close(intentional = true): void {
    this.intentionalClose = intentional;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      this.ws?.close();
    } catch {
      // ignore close errors
    }
    this.ws = null;
  }
}
