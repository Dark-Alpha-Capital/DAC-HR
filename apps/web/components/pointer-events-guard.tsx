import { useEffect } from "react";
import { clearStuckBodyPointerEvents } from "@/lib/radix-pointer-events";

/**
 * Radix DismissableLayer can leave pointer-events:none on body after overlays
 * close, which freezes tabs, selects, dropdowns, and all other clicks.
 */
export function PointerEventsGuard() {
  useEffect(() => {
    const cleanup = () => clearStuckBodyPointerEvents();

    cleanup();

    const observer = new MutationObserver(cleanup);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });

    document.addEventListener("pointerup", cleanup);
    window.addEventListener("focus", cleanup);

    return () => {
      observer.disconnect();
      document.removeEventListener("pointerup", cleanup);
      window.removeEventListener("focus", cleanup);
    };
  }, []);

  return null;
}
