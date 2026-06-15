const OPEN_RADIX_LAYER_SELECTOR = [
  '[data-state="open"][data-slot$="-overlay"]',
  '[data-state="open"][data-slot="sheet-content"]',
  '[data-state="open"][data-slot="drawer-content"]',
  '[data-state="open"][data-slot="dialog-content"]',
  '[data-state="open"][data-slot="select-content"]',
  '[data-state="open"][data-slot="dropdown-menu-content"]',
  '[data-state="open"][data-slot="popover-content"]',
  '[data-radix-popper-content-wrapper] [data-state="open"]',
  '[role="listbox"][data-state="open"]',
  '[role="menu"][data-state="open"]',
].join(", ");

export function hasOpenRadixLayer() {
  return Boolean(document.querySelector(OPEN_RADIX_LAYER_SELECTOR));
}

/** Radix DismissableLayer can leave pointer-events:none on body after overlays close. */
export function clearStuckBodyPointerEvents() {
  if (document.body.style.pointerEvents !== "none") return;
  if (hasOpenRadixLayer()) return;
  document.body.style.removeProperty("pointer-events");
}
