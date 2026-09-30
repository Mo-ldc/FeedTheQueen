import { UI_RULES } from '../config/UIConfig';
/** A completed hold or scroll must never become a purchase on release. */
export class LongPressGesture {
    static readonly delay = UI_RULES.longPressMs;
    static readonly tolerance = UI_RULES.dragTolerance;
    private started = 0;
    private x = 0;
    private y = 0;
    active = false;
    blocked = false;
    begin(now: number, x: number, y: number): void {
        this.started = now; this.x = x; this.y = y;
        this.active = true; this.blocked = false;
    }
    move(x: number, y: number): boolean {
        if (this.active && Math.hypot(x - this.x, y - this.y) > LongPressGesture.tolerance) {
            this.cancel(); return true;
        }
        return false;
    }
    ready(now: number): boolean { return this.active && now - this.started >= LongPressGesture.delay; }
    blocksClick(now: number): boolean { return this.blocked || this.ready(now); }
    finish(now: number): void { this.blocked ||= this.ready(now); this.active = false; }
    cancel(): void { this.active = false; this.blocked = true; }
}
