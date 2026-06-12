"use client";

import { useEffect } from "react";

function hasOpenRadixLayer() {
  return Boolean(
    document.querySelector(
      [
        '[data-state="open"][data-slot$="-overlay"]',
        '[data-state="open"][data-slot="sheet-content"]',
        '[data-state="open"][data-slot="drawer-content"]',
        '[data-state="open"][data-slot="dialog-content"]',
        '[data-state="open"][data-slot="select-content"]',
        '[data-state="open"][data-slot="dropdown-menu-content"]',
      ].join(", "),
    ),
  );
}

/**
 * Radix DismissableLayer can leave `pointer-events: none` on <body> after nested
 * overlays (dropdown → dialog, select inside modal, etc.) close. That freezes
 * the entire UI — sidebar links, selects, and buttons all stop responding.
 */
export function PointerEventsGuard() {
  useEffect(() => {
    const cleanup = () => {
      if (
        document.body.style.pointerEvents === "none" &&
        !hasOpenRadixLayer()
      ) {
        document.body.style.removeProperty("pointer-events");
      }
    };

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
