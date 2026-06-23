import { useEffect, useRef } from "react";
import type { CheatingEventType } from "@workspace/db/enums";

export function useCheatingPrevention(
  sendToDO: (eventType: CheatingEventType, metadata?: Record<string, unknown>) => void,
  enabled: boolean,
) {
  const sendRef = useRef(sendToDO);
  sendRef.current = sendToDO;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        sendRef.current("TAB_SWITCHED");
      }
    };

    const onBlur = () => {
      sendRef.current("WINDOW_BLUR");
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        sendRef.current("FULLSCREEN_EXITED");
      }
    };

    const onCopy = (event: ClipboardEvent) => {
      event.preventDefault();
      sendRef.current("COPY_ATTEMPT");
    };

    const onPaste = (event: ClipboardEvent) => {
      event.preventDefault();
      sendRef.current("PASTE_ATTEMPT");
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      sendRef.current("COPY_ATTEMPT", { source: "contextmenu" });
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [enabled]);
}
