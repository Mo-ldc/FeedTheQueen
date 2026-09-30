import { _decorator, Component, Node, UITransform, Label, Graphics, Color, BlockInputEvents, isValid } from 'cc';
import { BlueberryFeeding } from '../world/BlueberryFeeding';
import { ColonySession } from '../core/ColonySession';
import { GENE_TAB_INDEX } from '../config/UpgradeConfig';
import { playerMeta, savePlayerMeta } from '../core/PlayerMeta';
import { TUTORIALS } from '../config/TutorialConfig';
import { caption, choice } from '../world/FacilitySupport';
const { ccclass } = _decorator;

@ccclass('ColonyTutorial')
export class ColonyTutorial extends Component {
    private queue: { id: number; due: number }[] = [];
    private time = 0;
    public current = -1;
    private overlay: Node | null = null;
    private feeding!: BlueberryFeeding;
    private canvas: Node | null = null;

    start(): void {
        this.feeding = this.getComponent(BlueberryFeeding)!;
        this.canvas = this.node.parent;
        this.canvas?.on(Node.EventType.SIZE_CHANGED, this.layout, this);
        this.enqueue(0, 2);
        this.feeding.upgrades!.node.on('upgrade-purchased', this.purchase, this);
        this.feeding.upgrades!.node.on('tab-selected', this.tab, this);
    }
    public enqueue(id: number, delay = 1): void {
        if (playerMeta.tutorials?.includes(id) || this.queue.some(q => q.id === id) || this.current === id) return;
        this.queue.push({ id, due: this.time + delay });
    }
    private purchase(e: { id: string }): void {
        if (e.id === 'foragers_SpawnForager') this.enqueue(1);
        if (e.id === 'queen_SpawnLarvae') this.enqueue(7);
    }
    private tab(index: number): void {
        if (index !== GENE_TAB_INDEX) return;
        this.enqueue(4);
        if (this.getComponent(ColonySession)!.genes.run > 1) this.enqueue(6);
    }
    update(dt: number): void {
        const s = this.getComponent(ColonySession)!;
        if (!s.isReady || s.isDeparting) return;
        this.time += dt;
        if (this.feeding.upgrades!.upgradeState.resources.greyMatter > 0) this.enqueue(2);
        if (s.progression.dna > 0) this.enqueue(3);
        if (s.progression.dnaLevel >= 3) this.enqueue(5);
        if (this.current < 0 && this.queue.length && this.queue[0].due <= this.time) this.show(this.queue.shift()!.id);
    }
    private show(id: number): void {
        this.close();
        this.current = id;
        const n = this.overlay = new Node('Tutorial');
        n.layer = this.canvas!.layer;
        this.canvas!.addChild(n);
        n.addComponent(UITransform);
        n.addComponent(BlockInputEvents);
        n.addComponent(Graphics);
        const title = caption(n, 'Title', '教程 · ' + TUTORIALS[id].title, 0, 0, 600, 29);
        const body = caption(n, 'Description', TUTORIALS[id].text, 0, 0, 600, 25);
        for (const label of [title, body]) {
            // Long static paragraphs need TTF's CJK punctuation-aware wrapping.
            label.cacheMode = Label.CacheMode.NONE;
            label.color = Color.WHITE; label.enableOutline = true;
            label.outlineColor = Color.BLACK; label.outlineWidth = 2;
            label.enableWrapText = true; label.overflow = Label.Overflow.RESIZE_HEIGHT;
            label.verticalAlign = Label.VerticalAlign.TOP;
            label.node.getComponent(UITransform)!.setAnchorPoint(.5, 1);
        }
        body.lineHeight = 36;
        body.horizontalAlign = Label.HorizontalAlign.LEFT;
        const button = choice(n, 'Close', '知道了', 0, 0, 240, () => this.close());
        const label = button.getChildByName('Caption')!.getComponent(Label)!;
        label.color = Color.WHITE; label.outlineColor = Color.BLACK; label.outlineWidth = 2;
        this.layout();
        if (!playerMeta.tutorials?.includes(id)) { (playerMeta.tutorials ??= []).push(id); savePlayerMeta(); }
    }
    private layout = (): void => {
        const n = this.overlay, canvas = this.canvas?.getComponent(UITransform);
        if (!n || !canvas) return;
        const width = Math.min(660, Math.max(260, canvas.width - 40));
        const title = n.getChildByName('Title')!.getComponent(Label)!;
        const body = n.getChildByName('Description')!.getComponent(Label)!;
        for (const label of [title, body]) {
            label.node.getComponent(UITransform)!.width = width - 64;
            label.updateRenderData(true);
        }
        const titleHeight = title.node.getComponent(UITransform)!.height;
        const bodyHeight = body.node.getComponent(UITransform)!.height;
        const height = 28 + titleHeight + 24 + bodyHeight + 28 + 50 + 24;
        n.getComponent(UITransform)!.setContentSize(width, height);
        title.node.setPosition(0, height / 2 - 28);
        body.node.setPosition(0, height / 2 - 28 - titleHeight - 24);
        n.getChildByName('Close')!.setPosition(0, -height / 2 + 24 + 25);
        const g = n.getComponent(Graphics)!;
        g.clear(); g.fillColor = new Color(244, 218, 169); g.strokeColor = new Color(64, 38, 27); g.lineWidth = 6;
        g.roundRect(-width / 2, -height / 2, width, height, 18); g.fill(); g.stroke();
        const scale = Math.min(1, (canvas.width - 40) / width, (canvas.height - 60) / height);
        n.setScale(scale, scale, 1);
        n.setPosition(canvas.width * (.5 - canvas.anchorX), canvas.height * (.5 - canvas.anchorY));
        n.setSiblingIndex(this.canvas!.children.length - 1);
    };
    public close(): void { this.overlay?.destroy(); this.overlay = null; this.current = -1; }
    onDestroy(): void {
        this.canvas?.off(Node.EventType.SIZE_CHANGED, this.layout, this);
        this.feeding?.upgrades?.node.off('upgrade-purchased', this.purchase, this);
        this.feeding?.upgrades?.node.off('tab-selected', this.tab, this);
        if (this.overlay && isValid(this.overlay, true)) this.overlay.destroy();
    }
}
