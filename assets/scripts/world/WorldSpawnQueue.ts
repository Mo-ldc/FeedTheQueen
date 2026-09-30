import { _decorator, Component, director, isValid } from 'cc';
const { ccclass } = _decorator;
const now = (): number => typeof performance !== 'undefined' ? performance.now() : Date.now();

/** Share a small creation budget across all populations, including startup restores. */
@ccclass('WorldSpawnQueue')
export class WorldSpawnQueue extends Component {
    private frame = -1;
    private started = 0;
    private count = 0;
    private pending = new Map<Component, () => void>();

    public reserve(owner: Component, retry: () => void): boolean {
        const frame = director.getTotalFrames();
        if (frame !== this.frame) { this.frame = frame; this.count = 0; this.started = now(); }
        if (this.count >= 4 || (this.count > 0 && now() - this.started >= 2)) {
            this.pending.set(owner, retry);
            return false;
        }
        this.count++;
        return true;
    }

    lateUpdate(): void {
        // Snapshot so retries can safely requeue themselves for the next frame.
        for (const [owner, retry] of [...this.pending]) {
            if (!isValid(owner, true)) { this.pending.delete(owner); continue; }
            if (!owner.enabledInHierarchy) continue;
            this.pending.delete(owner);
            retry();
        }
    }

    public hasPending(owner: Component): boolean { return this.pending.has(owner); }
    onDestroy(): void { this.pending.clear(); }
}

export function reserveWorldSpawn(owner: Component, retry: () => void): boolean {
    const queue = owner.getComponent(WorldSpawnQueue) || owner.addComponent(WorldSpawnQueue);
    return queue.reserve(owner, retry);
}
