import { pinchZoom } from './cameraZoom.js';
import type { ZoomViewport } from './cameraZoom.js';

interface TouchPoint {
  x: number;
  y: number;
}

interface Contact extends TouchPoint {
  startedInArena: boolean;
  inArena: boolean;
}

interface Pinch {
  ids: [number, number];
  startDistance: number;
  startZoom: number;
}

export class TouchZoomController {
  private readonly contacts = new Map<number, Contact>();
  private hadMultipleTouches = false;
  private pinch?: Pinch;

  start(id: number, point: TouchPoint, inArena: boolean, zoom: number, touchCount: number): void {
    this.contacts.set(id, { x: point.x, y: point.y, startedInArena: inArena, inArena });
    if (touchCount > 1 || this.contacts.size > 1) this.hadMultipleTouches = true;
    if (this.contacts.size !== 2 || touchCount !== 2) {
      this.pinch = undefined;
      return;
    }

    const [first, second] = [...this.contacts.entries()];
    if (first[1].startedInArena && second[1].startedInArena) {
      this.pinch = {
        ids: [first[0], second[0]],
        startDistance: Math.hypot(first[1].x - second[1].x, first[1].y - second[1].y),
        startZoom: zoom
      };
    }
  }

  move(id: number, point: TouchPoint, inArena: boolean, zoom: number, viewport: ZoomViewport): number | null {
    const contact = this.contacts.get(id);
    if (!contact) return null;
    contact.x = point.x;
    contact.y = point.y;
    contact.inArena = inArena;
    if (!this.pinch) return null;
    const first = this.contacts.get(this.pinch.ids[0]);
    const second = this.contacts.get(this.pinch.ids[1]);
    if (!first || !second) return null;
    if (!first.inArena || !second.inArena) {
      this.pinch.startDistance = 0;
      return null;
    }
    const distance = Math.hypot(first.x - second.x, first.y - second.y);
    if (this.pinch.startDistance === 0) {
      if (distance > 0) {
        this.pinch.startDistance = distance;
        this.pinch.startZoom = zoom;
      }
      return null;
    }
    return pinchZoom(this.pinch.startZoom, this.pinch.startDistance, distance, viewport);
  }

  canTap(id: number): boolean {
    return !this.hadMultipleTouches && this.contacts.size === 1 && this.contacts.has(id);
  }

  end(id: number, cancelled: boolean, remainingTouches: number): boolean {
    const tap = !cancelled && this.canTap(id) && this.contacts.get(id)?.startedInArena === true;
    this.contacts.delete(id);
    this.pinch = undefined;
    if (remainingTouches === 0) this.reset();
    return tap;
  }

  reset(): void {
    this.contacts.clear();
    this.hadMultipleTouches = false;
    this.pinch = undefined;
  }
}
