import type { ReadingPosition } from "./db";

export function validPosition(value: ReadingPosition | undefined, panelCount: number): value is ReadingPosition {
  return !!value && Number.isInteger(value.panel) && value.panel >= 0 && value.panel < panelCount &&
    Number.isFinite(value.offset) && value.offset >= 0 && value.offset <= 1;
}

export function capturePosition(container: HTMLElement): ReadingPosition | undefined {
  const panels = Array.from(container.querySelectorAll<HTMLElement>("[data-panel]"));
  if (!panels.length) return undefined;
  const top = container.getBoundingClientRect().top;
  const index = panels.findIndex((panel) => panel.getBoundingClientRect().bottom > top + 1);
  const panel = index < 0 ? panels.length - 1 : index;
  const rect = panels[panel].getBoundingClientRect();
  return { panel, offset: Math.min(1, Math.max(0, (top - rect.top) / Math.max(1, rect.height))) };
}

export function positionScrollTop(container: HTMLElement, position: ReadingPosition): number | null {
  const panels = container.querySelectorAll<HTMLElement>("[data-panel]");
  if (!validPosition(position, panels.length)) return null;
  const rect = panels[position.panel].getBoundingClientRect();
  return container.scrollTop + rect.top - container.getBoundingClientRect().top + position.offset * rect.height;
}
