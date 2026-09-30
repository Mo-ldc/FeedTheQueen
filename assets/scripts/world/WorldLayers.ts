import { _decorator, Component, Node } from 'cc';
import { WorldDepth } from './WorldDepth';
const { ccclass } = _decorator;

/** Cocos UI siblings replace Godot's z_index bands; Actors replaces Main.y_sort. */
@ccclass('WorldLayers')
export class WorldLayers extends Component {
    private order = new Map<Node,number>();
    private nextOrder = 0;
    private sortElapsed = 0;
    private sortItems: { node: Node; band: number; y: number; order: number }[] = [];
    private sortRecords = new WeakMap<Node, { node: Node; band: number; y: number; order: number }>();
    onLoad(): void { this.ensureLayers(); }
    public ensureLayers(): void {
        for(const name of ['Actors','Foreground','Projectiles','WorldOverlay']) {
            if(!this.node.getChildByName(name)) {
                const layer=new Node(name);layer.layer=this.node.layer;this.node.addChild(layer);
            }
        }
        let currentIndex = 0;
        const bg = this.node.getChildByName('game_bg');
        if (bg) {
            bg.setSiblingIndex(currentIndex++);
        }
        const waves = this.node.getChildByName('OceanWaves');
        if (waves) {
            waves.setSiblingIndex(currentIndex++);
        }
        for (const name of ['Actors', 'Foreground', 'Projectiles', 'WorldOverlay']) {
            const layer = this.node.getChildByName(name);
            if (layer) {
                layer.setSiblingIndex(currentIndex++);
            }
        }
    }
    public get actors(): Node { return this.node.getChildByName('Actors')!; }
    public get projectiles(): Node { return this.node.getChildByName('Projectiles')!; }
    lateUpdate(dt: number): void {
        this.sortElapsed += dt;
        if (this.sortElapsed < 1 / 15) return;
        this.sortElapsed %= 1 / 15;
        this.sortActors();
    }
    public sortActors(): void {
        const actors = this.actors;
        if (!actors) return;
        const children = actors.children;
        const len = children.length;
        if (len <= 1) return;

        if (this.order.size > len + 120) {
            for (const n of this.order.keys()) {
                if (n.parent !== actors) this.order.delete(n);
            }
        }

        const items = this.sortItems;
        items.length = 0;
        for (let i = 0; i < len; i++) {
            const node = children[i];
            let order = this.order.get(node);
            if (order === undefined) {
                order = this.nextOrder++;
                this.order.set(node, order);
            }
            let depth = (node as any)._worldDepth as WorldDepth | null | undefined;
            if (depth === undefined) {
                depth = node.getComponent(WorldDepth);
                (node as any)._worldDepth = depth;
            }
            const band = depth ? depth.band : 0;
            let record = this.sortRecords.get(node);
            if (!record) { record = { node, band, y: node.position.y, order }; this.sortRecords.set(node, record); }
            record.band = band;
            record.y = node.position.y;
            items.push(record);
        }

        // Godot Y grows down; Cocos Y grows up. Lower feet must be drawn last.
        items.sort((a, b) => a.band - b.band || b.y - a.y || a.order - b.order);

        for (let i = 0; i < len; i++) {
            const n = items[i].node;
            if (children[i] !== n) {
                n.setSiblingIndex(i);
            }
        }
    }
}
