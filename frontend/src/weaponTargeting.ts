import type { WeaponSelection } from "./abilityControls";
import type { MortarRejectionReason } from "shared";

const crosshair = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g fill="none" stroke="#fff" stroke-width="5"><circle cx="16" cy="16" r="9"/><path d="M16 1v10m0 10v10M1 16h10m10 0h10"/></g><g fill="none" stroke="#e82030" stroke-width="3"><circle cx="16" cy="16" r="9"/><path d="M16 1v10m0 10v10M1 16h10m10 0h10"/></g><circle cx="16" cy="16" r="2" fill="#e82030"/></svg>`;
const bomb = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M19 10l3-5 5 1m-1-5v8m-4-4h8" fill="none" stroke="#fff" stroke-width="4"/><path d="M19 10l3-5 5 1m-1-5v8m-4-4h8" fill="none" stroke="#ffb52e" stroke-width="2"/><circle cx="15" cy="19" r="11" fill="#18212c" stroke="#fff" stroke-width="2"/><path d="M8 17q0-6 6-6" fill="none" stroke="#aabbd0" stroke-width="2"/><path d="M15 14v10m-5-5h10" stroke="#ff3545" stroke-width="2"/></svg>`;

export function getWeaponCursor(selection: WeaponSelection): string | null {
  if (!selection) return null;
  const svg = selection === "rocket" ? crosshair : bomb;
  const hotspot = selection === "rocket" ? "16 16" : "15 19";
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot}, crosshair`;
}

export function applyWeaponCursor(canvas: HTMLCanvasElement, selection: WeaponSelection): void {
  const cursor = getWeaponCursor(selection);
  if (cursor) {
    canvas.style.setProperty("--goonbash-weapon-cursor", cursor);
    canvas.classList.add("goonbash-weapon-targeting");
  } else {
    canvas.classList.remove("goonbash-weapon-targeting");
    canvas.style.removeProperty("--goonbash-weapon-cursor");
  }
}

export function mortarShellHeight(progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  return 4 * 100 * t * (1 - t);
}

export const MORTAR_REJECTION_TEXT: Record<MortarRejectionReason, string> = {
  invalid_point: "Choose a point inside the arena.",
  out_of_range: "Mortar target is beyond 900 range.",
  unavailable: "Mortar is only available to the Damagedealer.",
  unlearned: "Learn Mortar before firing.",
  cooldown: "Mortar is still cooling down.",
  inactive: "Mortar requires a living tank in an active match."
};
