import { _decorator, Button, Color, Component, Graphics, Label, Node, UITransform, Vec3, tween, isValid, Sprite, SpriteFrame, EventTouch } from 'cc';
import { gameResources as resources } from '../managers/GameBundles';
import AdSDK, { RewardedAdRequest } from '../managers/AdSDK';
import { ColonySession } from '../core/ColonySession';
import { BlueberryFeeding } from '../world/BlueberryFeeding';
import { QueenLifecycle } from '../world/QueenLifecycle';
import { FacilityUpgradePanel } from './FacilityUpgradePanel';
import { UpgradeState } from './UpgradeState';
import { useDefaultSystemFont } from './DefaultSystemFont';
import { formatOriginal } from './OriginalUIRules';

const { ccclass } = _decorator;
type RewardKey = 'larvae' | 'umami' | 'feast' | 'brain' | 'dna' | 'nourishment' | 'chest';
const REWARD_NAMES = { larvae: '幼虫', nourishment: '苹果', brain: '脑灰质', dna: '基因', umami: '鸡油菌' };
const REWARD_COPY: Record<RewardKey, { title: string; description: string }> = {
    larvae: { title: '补给幼虫', description: '观看完整视频，立即获得幼虫。' },
    umami: { title: '补给鲜味', description: '观看完整视频，立即补充鲜味层数；之后肉食获得4倍食物。' },
    feast: { title: '蚁后盛宴', description: '观看完整视频，接下来30次进食的基础食物价值翻倍。' },
    brain: { title: '补充脑灰质', description: '观看完整视频，立即获得1点脑灰质。' },
    dna: { title: '补充基因', description: '观看完整视频，立即获得1点可分配的永久基因点数。' },
    nourishment: { title: '蚁后食物', description: '观看完整视频，立即获得锁定数量的蚁后食物。' },
    chest: { title: '惊喜宝箱', description: '观看完整视频，获得双倍进度食物和1只幼虫。' },
};
const FIRST_CHEST_SECONDS = 45;
const CHEST_INTERVAL_SECONDS = 90;

@ccclass('RewardedAdSidebar')
export class RewardedAdSidebar extends Component {
    private feeding!: BlueberryFeeding;
    private session!: ColonySession;
    private panel!: FacilityUpgradePanel;
    private ui!: Node;
    private canvas!: Node;
    private buttons = new Map<RewardKey, Node>();
    private rewardLabels = new Map<RewardKey, Label>();
    private rewardRowHandlers = new Map<Node, () => void>();
    private pendingAmounts = new Map<RewardKey, number>();
    private busy = new Set<string>();
    private buttonHandlers = new Map<Node, () => void>();
    private elapsed = 0;
    private chestClock = 0;
    private nextChest = FIRST_CHEST_SECONDS;
    private modal: Node | null = null;
    private toast: Label | null = null;
    private toastTimer = 0;

    // Moving Flying Chest
    private flyingChest: Node | null = null;
    private chestFlightStart = new Vec3();
    private chestFlightEnd = new Vec3();
    private chestFlightDuration = 15;
    private chestFlightAge = 0;
    private chestInFlight = false;
    private chestPaused = false;

    start(): void {
        this.feeding = this.getComponent(BlueberryFeeding)!;
        this.session = this.getComponent(ColonySession)!;
        this.panel = this.feeding.upgrades!;
        this.ui = this.panel.node.parent!; this.canvas = this.ui.parent!;
        const left: RewardKey[] = ['larvae', 'umami', 'feast'];
        const right: RewardKey[] = ['brain', 'dna', 'nourishment'];
        left.forEach(key => this.bindButton(key));
        right.forEach(key => this.bindButton(key));
        this.flyingChest = this.createFlyingChest();
        this.panel.node.on('direct-upgrade-offer', this.onDirectUpgradeOffer, this);
        this.canvas.on(Node.EventType.SIZE_CHANGED, this.layout, this);
        this.layout(); this.refreshButtons();
    }

    private bindButton(key: RewardKey): void {
        const node = this.ui.getChildByName('RewardAd_' + key); if (!node) return;
        this.buttons.set(key, node);
        const amount = node.getChildByPath('Reward/Amount')?.getComponent(Label);
        if (amount) this.rewardLabels.set(key, amount);
        const row = amount?.node.parent;
        if (row) {
            const rewardIcon = row.getChildByName('Icon');
            if (rewardIcon) rewardIcon.active = false;
            // Layout measures the actual text width. Center short rewards; let long
            // rewards grow to the left so the rightmost sidebar stays on screen.
            const align = () => {
                const width = row.getComponent(UITransform)!.width * Math.abs(row.scale.x);
                const available = node.getComponent(UITransform)!.width;
                row.setPosition(Math.min(0, (available - width) / 2), row.position.y, row.position.z);
            };
            row.on(Node.EventType.SIZE_CHANGED, align, this);
            node.on(Node.EventType.SIZE_CHANGED, align, this);
            this.rewardRowHandlers.set(row, align); align();
        }
        const handler = () => this.activate(key); this.buttonHandlers.set(node, handler);
        node.on(Button.EventType.CLICK, handler, this);
    }

    private createFlyingChest(): Node {
        const node = new Node('FlyingChest'); node.layer = this.ui.layer; this.ui.addChild(node);
        node.addComponent(UITransform).setContentSize(84, 84);

        // Breathing golden aura glow
        const glow = new Node('Glow'); glow.layer = node.layer; node.addChild(glow);
        glow.addComponent(UITransform).setContentSize(96, 96);
        const g = glow.addComponent(Graphics);
        g.fillColor = new Color(255, 215, 0, 85);
        g.circle(0, 0, 44); g.fill();
        tween(glow)
            .to(0.7, { scale: new Vec3(1.15, 1.15, 1) }, { easing: 'sineInOut' })
            .to(0.7, { scale: new Vec3(0.9, 0.9, 1) }, { easing: 'sineInOut' })
            .union().repeatForever().start();

        // Chest icon using jx.png
        const iconNode = new Node('Icon'); iconNode.layer = node.layer; node.addChild(iconNode);
        iconNode.addComponent(UITransform).setContentSize(70, 76);
        const sprite = iconNode.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        resources.load('upgrade-skin/ad-points/jx/spriteFrame', SpriteFrame, (err, frame) => {
            if (!err && frame && isValid(sprite, true)) sprite.spriteFrame = frame;
        });

        // Watch ad badge at bottom right
        const badgeNode = new Node('AdBadge'); badgeNode.layer = node.layer; node.addChild(badgeNode);
        badgeNode.addComponent(UITransform).setContentSize(26, 20);
        badgeNode.setPosition(24, -22, 0);
        const badgeBg = badgeNode.addComponent(Graphics);
        badgeBg.fillColor = new Color(0, 0, 0, 180);
        badgeBg.roundRect(-13, -10, 26, 20, 4); badgeBg.fill();
        const badgeIcon = new Node('Icon'); badgeIcon.layer = node.layer; badgeNode.addChild(badgeIcon);
        badgeIcon.addComponent(UITransform).setContentSize(20, 15);
        const badgeSprite = badgeIcon.addComponent(Sprite); badgeSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        resources.load('upgrade-skin/watch_ad_badge/spriteFrame', SpriteFrame, (err, frame) => {
            if (!err && frame && isValid(badgeSprite, true)) badgeSprite.spriteFrame = frame;
        });

        const button = node.addComponent(Button); button.transition = Button.Transition.NONE;
        node.on(Button.EventType.CLICK, () => this.activate('chest'), this);
        node.active = false;
        return node;
    }

    private startChestFlight(): void {
        const chest = this.flyingChest;
        if (!chest || !this.canvas?.isValid) return;
        const size = this.canvas.getComponent(UITransform);
        if (!size) return;
        const halfW = size.width / 2, halfH = size.height / 2;

        // Choose start side and distinct exit side (0: Left, 1: Right, 2: Top, 3: Bottom)
        const sideIn = Math.floor(Math.random() * 4);
        let sideOut = Math.floor(Math.random() * 3);
        if (sideOut >= sideIn) sideOut++;

        const pad = 85;
        const getCoord = (side: number): { x: number; y: number } => {
            switch (side) {
                case 0: return { x: -halfW - pad, y: (Math.random() * 0.7 - 0.35) * size.height };
                case 1: return { x: halfW + pad, y: (Math.random() * 0.7 - 0.35) * size.height };
                case 2: return { x: (Math.random() * 0.7 - 0.35) * size.width, y: halfH + pad };
                default: return { x: (Math.random() * 0.7 - 0.35) * size.width, y: -halfH - pad };
            }
        };

        const start = getCoord(sideIn), end = getCoord(sideOut);
        this.chestFlightStart.set(start.x, start.y, 0);
        this.chestFlightEnd.set(end.x, end.y, 0);

        const dist = Math.hypot(end.x - start.x, end.y - start.y);
        this.chestFlightDuration = Math.max(12, Math.min(20, dist / 90));
        this.chestFlightAge = 0;
        this.chestInFlight = true;
        this.chestPaused = false;

        chest.setPosition(start.x, start.y, 0);
        chest.setScale(0.88, 0.88, 1);
        chest.active = true;
        chest.setSiblingIndex(this.ui.children.length - 1);
    }

    private layout = (): void => {
        if (!this.ui?.isValid || !this.canvas?.isValid) return;
        if (this.modal) this.modal.setPosition(0, 0);
    };

    update(dt: number): void {
        this.elapsed += dt;
        if (!this.chestInFlight) {
            this.chestClock += dt;
            if (this.chestClock >= this.nextChest && this.queenReady()) {
                this.chestClock = 0;
                this.nextChest = CHEST_INTERVAL_SECONDS;
                this.startChestFlight();
            }
        } else if (!this.chestPaused && this.flyingChest) {
            this.chestFlightAge += dt;
            const progress = this.chestFlightAge / this.chestFlightDuration;
            if (progress >= 1) {
                // Finished journey across the screen and exited
                this.chestInFlight = false;
                this.flyingChest.active = false;
                this.chestClock = 0;
                this.nextChest = CHEST_INTERVAL_SECONDS;
            } else {
                const dx = this.chestFlightEnd.x - this.chestFlightStart.x;
                const dy = this.chestFlightEnd.y - this.chestFlightStart.y;
                const len = Math.hypot(dx, dy) || 1;
                const perpX = -dy / len, perpY = dx / len;
                const wave = Math.sin(progress * Math.PI * 4) * 22;
                const posX = this.chestFlightStart.x + dx * progress + perpX * wave;
                const posY = this.chestFlightStart.y + dy * progress + perpY * wave;
                this.flyingChest.setPosition(posX, posY, 0);

                const icon = this.flyingChest.getChildByName('Icon');
                if (icon) {
                    icon.angle = Math.sin(this.chestFlightAge * 3.5) * 8;
                }
            }
        }
        if (this.elapsed >= .5) { this.elapsed = 0; this.refreshButtons(); }
        if (this.toast && this.toastTimer > 0) { this.toastTimer -= dt; if (this.toastTimer <= 0 && isValid(this.toast.node, true)) { this.toast.node.destroy(); this.toast = null; } }
    }

    private queenReady(): boolean {
        const queen = this.feeding.queen?.getComponent(QueenLifecycle);
        return this.session.isReady && !!queen?.isReady;
    }

    private refreshButtons(): void {
        const state = this.panel.upgradeState, can: Record<Exclude<RewardKey, 'chest'>, boolean> = {
            larvae: this.session.isReady,
            umami: !!state.level('evolution_BuildingMushrooms') && this.feeding.tastes.state.umami < this.umamiCapacity(),
            feast: this.session.isReady,
            brain: state.hasHadBrain,
            dna: this.session.progression.dnaLevel < 50 && this.session.genes.available < 50,
            nourishment: true,
        };
        (Object.keys(can) as Exclude<RewardKey, 'chest'>[]).forEach(key => {
            const node = this.buttons.get(key); if (!node) return;
            const available = can[key], inProgress = this.busy.has(key); node.active = available || inProgress;
            const button = node.getComponent(Button)!; button.interactable = available && !inProgress;
            const g = node.getComponent(Graphics); if (g) { g.clear(); g.fillColor = button.interactable ? new Color(111, 72, 47, 245) : new Color(91, 76, 64, 210); g.strokeColor = button.interactable ? new Color(247, 195, 119) : new Color(145, 124, 104); g.lineWidth = 3; g.roundRect(-28, -28, 56, 56, 12); g.fill(); g.stroke(); }
            const label = node.getChildByName('Label')?.getComponent(Label); if (label) label.color = button.interactable ? new Color(255, 239, 207) : new Color(184, 169, 149);
            const icon = node.getChildByName('Icon')?.getComponent(Sprite); if (icon) icon.color = button.interactable ? Color.WHITE : new Color(160, 160, 160, 255);
            const amount = this.pendingAmounts.get(key) ?? this.rewardAmount(key);
            const text = key === 'feast' ? `营养翻倍` : `+${formatOriginal(amount)}${REWARD_NAMES[key]}`;
            const rewardLabel = this.rewardLabels.get(key);
            if (rewardLabel && rewardLabel.string !== text) rewardLabel.string = text;
        });
    }

    private umamiCapacity(): number { return 200 + (this.panel.upgradeState.level('mushrooms_SpawnHandler') + this.panel.upgradeState.level('mushrooms_SpawnMycologist')) * 20; }

    /** The preview and ad request share the same reward calculation. */
    private rewardAmount(key: RewardKey): number {
        switch (key) {
            case 'larvae': return this.session.progression.queenLevel < 4 ? 3 : 5;
            case 'umami': return Math.max(0, Math.min(20, this.umamiCapacity() - this.feeding.tastes.state.umami));
            case 'feast': return 30;
            case 'brain': case 'dna': return 1;
            case 'chest': return this.nutrientReward() * 2;
            default: return this.nutrientReward();
        }
    }

    private activate(key: RewardKey): void {
        if (key === 'chest') {
            if (this.chestInFlight && this.queenReady()) {
                this.chestPaused = true;
                this.requestReward('chest');
            } else if (!this.queenReady()) {
                this.showToast('蚁后尚未就绪，请稍后');
            }
            return;
        }
        if (key === 'umami' && this.rewardAmount(key) <= 0) return;
        if (key === 'brain' && !this.panel.upgradeState.hasHadBrain) return;
        if (key === 'dna' && (this.session.progression.dnaLevel >= 50 || this.session.genes.available >= 50)) return;
        this.requestReward(key, this.rewardAmount(key));
    }

    private nutrientReward(): number {
        const nutrients = this.panel.upgradeState.resources.nutrients;
        return Math.ceil(Math.max(100, Math.max(nutrients * .12, this.feeding.window.rate)));
    }

    private confirm(copy: { title: string; description: string }, accept: () => void, cancel?: () => void): void {
        this.closeModal(); const root = new Node('RewardConfirmation'); root.layer = this.ui.layer; this.ui.addChild(root); this.modal = root;
        const size = this.canvas.getComponent(UITransform)!; root.addComponent(UITransform).setContentSize(size.width, size.height);
        const shade = root.addComponent(Graphics); shade.fillColor = new Color(0, 0, 0, 150); shade.rect(-size.width / 2, -size.height / 2, size.width, size.height); shade.fill();
        root.on(Node.EventType.TOUCH_START, (e: EventTouch) => { e.propagationStopped = true; });
        const card = new Node('Card'); card.layer = root.layer; root.addChild(card); card.addComponent(UITransform).setContentSize(430, 270); const g = card.addComponent(Graphics); g.fillColor = new Color(78, 52, 35, 255); g.strokeColor = new Color(247, 195, 119); g.lineWidth = 4; g.roundRect(-215, -135, 430, 270, 22); g.fill(); g.stroke();
        this.makeDialogLabel(card, 'Title', copy.title, 0, 80, 380, 34); this.makeDialogLabel(card, 'Description', copy.description, 0, 18, 380, 72);
        this.dialogButton(card, 'Watch', '看视频', -100, -82, 150, () => { this.closeModal(); accept(); });
        this.dialogButton(card, 'Cancel', '取消', 100, -82, 150, () => { this.closeModal(); cancel?.(); });
    }

    private makeDialogLabel(parent: Node, name: string, text: string, x: number, y: number, width: number, height: number): void {
        const node = new Node(name); node.layer = parent.layer; parent.addChild(node); node.setPosition(x, y); node.addComponent(UITransform).setContentSize(width, height); const label = node.addComponent(Label); useDefaultSystemFont(label); label.string = text; label.fontSize = name === 'Title' ? 28 : 22; label.lineHeight = 30; label.isBold = true; label.color = Color.WHITE; label.enableOutline = true; label.outlineColor = Color.BLACK; label.outlineWidth = 2; label.horizontalAlign = Label.HorizontalAlign.CENTER; label.verticalAlign = Label.VerticalAlign.CENTER; label.enableWrapText = true; label.overflow = Label.Overflow.SHRINK;
    }

    private dialogButton(parent: Node, name: string, text: string, x: number, y: number, width: number, callback: () => void): void {
        const node = new Node(name); node.layer = parent.layer; parent.addChild(node); node.setPosition(x, y); node.addComponent(UITransform).setContentSize(width, 54); const g = node.addComponent(Graphics); g.fillColor = new Color(185, 119, 65); g.strokeColor = new Color(247, 195, 119); g.lineWidth = 2; g.roundRect(-width / 2, -27, width, 54, 14); g.fill(); g.stroke(); const n = new Node('Label'); n.layer = node.layer; node.addChild(n); n.addComponent(UITransform).setContentSize(width - 8, 48); const l = n.addComponent(Label); useDefaultSystemFont(l); l.string = text; l.fontSize = 23; l.color = new Color(255, 244, 220); node.addComponent(Button); node.on(Button.EventType.CLICK, callback, this);
    }

    private closeModal(): void { if (this.modal && isValid(this.modal, true)) this.modal.destroy(); this.modal = null; }

    private requestReward(key: RewardKey, amount?: number): void {
        if (this.busy.has(key)) return;
        if (key === 'chest' && !this.queenReady()) { this.chestPaused = false; return; }
        const frozenAmount = amount ?? this.rewardAmount(key);
        const request: RewardedAdRequest = {
            placement: key === 'chest' ? 'surprise_chest' : key === 'nourishment' ? 'queen_nourishment' : `sidebar_${key}`,
            scene: 'game',
            rewardType: key === 'chest' ? 'nutrients_and_larva' : key,
            rewardAmount: frozenAmount,
            rewardUnit: key === 'larvae' || key === 'chest' ? 'larvae' : key === 'umami' ? 'umami' : key === 'feast' ? 'meals' : key === 'brain' ? 'grey_matter' : key === 'dna' ? 'dna' : 'nutrients',
            data: { rewardAmount: frozenAmount, larvae: key === 'chest' ? 1 : 0 }
        };
        this.pendingAmounts.set(key, frozenAmount);
        this.busy.add(key); this.refreshButtons();
        AdSDK.showRewardedVideo(request, {
            onRewarded: () => {
                this.grant(key, frozenAmount);
                AdSDK.reportRewardAdGrant(request);
                this.busy.delete(key);
                this.pendingAmounts.delete(key);
                this.refreshButtons();
                this.session.save();
            },
            onFailed: reason => {
                this.busy.delete(key);
                this.pendingAmounts.delete(key);
                this.refreshButtons();
                if (key === 'chest') this.chestPaused = false;
                if (reason !== 'not_configured') this.showToast('广告未完成，奖励未发放');
            }
        });
    }

    private grant(key: RewardKey, amount: number): void {
        const state = this.panel.upgradeState, wallet = state.resources;
        if (key === 'larvae') this.panel.setResources(wallet.nutrients, wallet.larvae + amount, wallet.greyMatter);
        else if (key === 'umami') { this.feeding.tastes.state.umami = Math.min(this.umamiCapacity(), this.feeding.tastes.state.umami + amount); this.feeding.refreshPresentation(); }
        else if (key === 'feast') this.feeding.tastes.feastCharges += amount;
        else if (key === 'brain') this.panel.setResources(wallet.nutrients, wallet.larvae, wallet.greyMatter + 1);
        else if (key === 'dna') {
            if (!this.session.progression.grantDnaPoint()) return;
            this.session.genes.available = Math.min(50, this.session.genes.available + 1); state.genes = this.session.genes.flags;
            this.session.refreshRewardState(); this.panel.node.emit('genes-changed'); this.panel.refresh();
        } else if (key === 'nourishment') this.panel.setResources(wallet.nutrients + amount, wallet.larvae, wallet.greyMatter);
        else if (key === 'chest') {
            const nutrients = amount || (this.nutrientReward() * 2);
            this.panel.setResources(wallet.nutrients + nutrients, wallet.larvae + 1, wallet.greyMatter);
            this.chestInFlight = false;
            this.chestPaused = false;
            if (this.flyingChest) this.flyingChest.active = false;
            this.chestClock = 0;
            this.nextChest = CHEST_INTERVAL_SECONDS;
            this.showToast(`获得惊喜宝箱：+${formatOriginal(nutrients)}食物，+1幼虫！`);
        }
    }

    private onDirectUpgradeOffer(data: { id: string; title: string }): void {
        const item = this.panel.upgradeState.item(data.id); if (!item || this.panel.upgradeState.isMaxed(item) || !this.panel.upgradeState.isUnlocked(item)) return;
        this.requestDirectUpgrade(data.id, data.title);
    }

    private requestDirectUpgrade(id: string, title: string): void {
        if (this.busy.has('direct_upgrade')) return;
        const request: RewardedAdRequest = { placement: 'direct_upgrade', scene: 'game', rewardType: 'upgrade', rewardAmount: 1, rewardUnit: 'level', data: { upgradeId: id } };
        this.busy.add('direct_upgrade'); this.refreshButtons();
        AdSDK.showRewardedVideo(request, { onRewarded: () => { const item = this.panel.upgradeState.item(id); if (item && !this.panel.upgradeState.isMaxed(item) && this.panel.upgradeState.isUnlocked(item) && this.panel.purchaseFreeLevel(id)) { AdSDK.reportRewardAdGrant(request); this.session.save(); } else if (item) this.showToast(`「${title}」已无法升级`); this.busy.delete('direct_upgrade'); this.refreshButtons(); }, onFailed: reason => { this.busy.delete('direct_upgrade'); this.refreshButtons(); if (reason !== 'not_configured') this.showToast('广告未完成，未执行升级'); } });
    }

    private showToast(message: string): void {
        if (this.toast && isValid(this.toast.node, true)) this.toast.node.destroy();
        const node = new Node('RewardToast'); node.layer = this.ui.layer; this.ui.addChild(node); node.addComponent(UITransform).setContentSize(420, 60); node.setPosition(0, 0); const l = node.addComponent(Label); useDefaultSystemFont(l); l.string = message; l.fontSize = 24; l.color = Color.WHITE; l.enableOutline = true; l.outlineColor = Color.BLACK; l.outlineWidth = 2; l.isBold = true; this.toast = l; this.toastTimer = 2.5;
    }

    onDestroy(): void {
        this.panel?.node.off('direct-upgrade-offer', this.onDirectUpgradeOffer, this); this.canvas?.off(Node.EventType.SIZE_CHANGED, this.layout, this); this.closeModal();
        this.buttonHandlers.forEach((handler, node) => { if (isValid(node, true)) node.off(Button.EventType.CLICK, handler, this); }); this.buttonHandlers.clear(); this.buttons.clear();
        this.rewardLabels.clear(); this.pendingAmounts.clear();
        this.rewardRowHandlers.forEach((handler, row) => { if (isValid(row, true)) { row.off(Node.EventType.SIZE_CHANGED, handler, this); row.parent?.off(Node.EventType.SIZE_CHANGED, handler, this); } });
        this.rewardRowHandlers.clear();
        if (this.flyingChest && isValid(this.flyingChest, true)) this.flyingChest.destroy();
        if (this.toast && isValid(this.toast.node, true)) this.toast.node.destroy();
    }
}
