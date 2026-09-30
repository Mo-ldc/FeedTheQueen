import { _decorator, Button, Component, isValid, Label, Node, UITransform, Vec3 } from 'cc';
import AdSDK, { PlatformActionCallbacks, PlatformActionRequest } from '../managers/AdSDK';
import { GameMenu } from './GameMenu';
import { useDefaultSystemFont } from './DefaultSystemFont';
import { MAIN_PROMOTION_REWARDS, MainPromotion } from '../config/MainPromotionConfig';
const { ccclass } = _decorator;
export type { MainPromotion } from '../config/MainPromotionConfig';

/** Scene-authored promotion dialogs connected to the shared AdSDK boundary. */
@ccclass('MainMenuPromotions')
export class MainMenuPromotions extends Component {
    private dialogs: Node | null = null;
    private activePanel: Node | null = null;
    private authored = new Map<Node, { position: Vec3; scale: Vec3 }>();
    private handlers = new Map<Node, () => void>();
    private pending = new Set<MainPromotion>();

    start(): void {
        this.dialogs = this.node.getChildByName('PromotionDialogs');
        if (!this.dialogs) return;
        for (const [kind, buttonName] of [['Entry', 'EntryRewardButton'], ['Share', 'ShareButton'], ['Desktop', 'DesktopButton']] as const) {
            const panel = this.dialogs.getChildByName(kind + 'Panel');
            if (!panel) continue;
            const reward = MAIN_PROMOTION_REWARDS[kind];
            const amount = panel.getChildByPath('RewardContent/Amount')?.getComponent(Label);
            if (amount) amount.string = `${reward.rewardUnit} +${reward.rewardAmount}`;
            this.authored.set(panel, { position: panel.position.clone(), scale: panel.scale.clone() });
            this.bind(this.node.getChildByName(buttonName), () => this.open(kind));
            this.bind(panel.getChildByName('Close'), () => this.close());
            this.bind(panel.getChildByName('Action'), () => this.performAction(kind));
        }
        this.node.on(Node.EventType.SIZE_CHANGED, this.layout, this);
        this.close();
    }

    private bind(node: Node | null, callback: () => void): void {
        if (!node) return;
        node.on(Button.EventType.CLICK, callback, this);
        this.handlers.set(node, callback);
    }

    public open(kind: MainPromotion): void {
        if (!this.dialogs) return;
        this.close();
        this.getComponent(GameMenu)?.close();
        this.activePanel = this.dialogs.getChildByName(kind + 'Panel');
        if (!this.activePanel) return;
        this.dialogs.active = true;
        this.dialogs.setSiblingIndex(this.node.children.length - 1);
        this.activePanel.active = true;
        this.layout();
    }

    public close(): void {
        if (this.dialogs) {
            for (const panel of this.authored.keys()) panel.active = false;
            this.dialogs.active = false;
        }
        this.activePanel = null;
    }

    private layout(): void {
        if (!this.dialogs?.active) return;
        const size = this.node.getComponent(UITransform)!;
        const shade = this.dialogs.getChildByName('Shade')!;
        shade.getComponent(UITransform)!.setContentSize(size.contentSize);
        const scale = Math.min(1, (size.width - 16) / 729, size.height / 1800);
        this.authored.forEach((base, panel) => {
            panel.setScale(base.scale.x * scale, base.scale.y * scale, base.scale.z);
            panel.setPosition(base.position.x * size.width / 750, base.position.y * size.height / 1800, base.position.z);
        });
    }

    private performAction(kind: MainPromotion): void {
        if (this.pending.has(kind)) return;
        const panel = this.dialogs?.getChildByName(kind + 'Panel');
        if (!panel) return;
        const button = panel.getChildByName('Action')?.getComponent(Button);
        const status = panel.getChildByName('Status')?.getComponent(Label);
        const showStatus = (message: string) => { if (status && isValid(status, true)) { useDefaultSystemFont(status); status.string = message; } };
        const finish = (): boolean => {
            if (!isValid(this, true) || !isValid(panel, true)) return false;
            this.pending.delete(kind);
            if (button) button.interactable = true;
            return true;
        };
        this.pending.add(kind);
        if (button) button.interactable = false;
        showStatus('处理中…');
        const request: PlatformActionRequest = { ...MAIN_PROMOTION_REWARDS[kind], scene: 'Main' };
        const callbacks: PlatformActionCallbacks = {
            onSuccess: result => {
                if (!finish()) return;
                showStatus({ Entry: '侧边栏已打开', Share: '分享操作已完成', Desktop: '已添加到桌面' }[kind]);
                // Forward the configured reward with the result. Opening the sidebar
                // alone does not prove a rewarded re-entry; eligibility belongs to the SDK bridge.
                this.node.emit('main-menu-action-result', { kind, request, success: true, result });
            },
            onFailed: reason => {
                if (!finish()) return;
                showStatus(reason === 'cancelled' || reason === 'canceled' ? '已取消' : '当前暂不可用，请稍后再试');
                this.node.emit('main-menu-action-result', { kind, request, success: false, reason });
            },
        };
        if (kind === 'Entry') AdSDK.openSidebar(request, callbacks);
        else if (kind === 'Share') AdSDK.shareApp(request, callbacks);
        else AdSDK.addToDesktop(request, callbacks);
    }

    onDestroy(): void {
        this.node.off(Node.EventType.SIZE_CHANGED, this.layout, this);
        this.handlers.forEach((handler, node) => { if (node.isValid) node.off(Button.EventType.CLICK, handler, this); });
        this.handlers.clear();
        this.pending.clear();
    }
}
