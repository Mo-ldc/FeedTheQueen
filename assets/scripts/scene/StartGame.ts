import '../core/RenderingSetup';
import {
    _decorator,
    Component,
    director,
    isValid,
    Label,
    Node,
    UITransform,
    Sprite,
    Button,
    Vec3,
} from 'cc';
import { consumeMainMenuRequest, loadGameThroughLoading } from './SceneTransition';
import { useDefaultSystemFont } from '../ui/DefaultSystemFont';
import { loadGameScene } from '../managers/GameBundles';
import { paperSurface, PORTRAIT } from '../ui/PortraitUI';

const { ccclass } = _decorator;

/** Scene-authored Main artwork and the separate preload screen. */
@ccclass('StartGame')
export class StartGame extends Component {
    private progress = 0;
    private elapsed = 0;
    private opening = false;
    private autoEnter = false;
    private loadFailed = false;
    private loadingGame = false;
    private mainControls = new Map<Node, { position: Vec3; scale: Vec3 }>();

    onLoad(): void {
        if (this.node.scene?.name === 'Main') {
            for (const name of ['Button', 'RestartButton', 'SettingsButton', 'EntryRewardButton', 'ShareButton', 'DesktopButton']) {
                const control = this.node.getChildByName(name);
                if (control) this.mainControls.set(control, { position: control.position.clone(), scale: control.scale.clone() });
            }
            this.autoEnter = !consumeMainMenuRequest();
            const button = this.node.getChildByName('Button');
            if (button) button.active = !this.autoEnter;
            const restart = this.node.getChildByName('RestartButton');
            if (restart) restart.active = !this.autoEnter;
        }
        this.node.on(Node.EventType.SIZE_CHANGED, this.layout, this);
        this.node.on(Node.EventType.TOUCH_END, this.retryLoading, this);
        this.layout();
    }

    start(): void {
        if (this.node.scene?.name === 'Main') {
            if (this.autoEnter) this.openWorld();
            return;
        }
        if (director.getScene()?.name !== 'Loading') return;
        this.loadWorld();
    }

    private loadWorld(): void {
        if (this.loadingGame) return;
        this.loadingGame = true;
        this.loadFailed = false;
        this.progress = 0;
        const label = this.node.getChildByName('LoadingStatus')?.getChildByName('Label')?.getComponent(Label);
        if (label) {
            useDefaultSystemFont(label);
            label.fontSize = 32;
            label.string = '加载中 0%';
        }

        void loadGameScene((completed, total) => {
            if (!isValid(this, true)) return;
            this.progress = Math.max(this.progress, total > 0 ? Math.min(1, completed / total) : 0);
            this.renderProgress();
            const percent = Math.floor(this.progress * 100);
            if (label && isValid(label, true)) label.string = `加载中 ${percent}%`;
        }).then(scene => {
            if (!isValid(this, true)) return;
            this.progress = 1;
            this.renderProgress();
            if (label) label.string = '加载中 100%';
            this.scheduleOnce(() => director.runScene(scene), 0);
        }).catch(error => {
            if (!isValid(this, true)) return;
            this.loadingGame = false;
            this.loadFailed = true;
            console.warn('Game subpackage load failed', error);
            if (label && isValid(label, true)) label.string = '加载失败，点击重试';
        });
    }

    private retryLoading(): void {
        if (this.loadFailed && this.node.scene?.name === 'Loading') this.loadWorld();
    }

    private layout(): void {
        const size = this.node.getComponent(UITransform)!;
        const background = this.node.getChildByName('bg')!;
        const cover = Math.max(size.width / 750, size.height / 1800);
        background.setPosition(0, 0);
        background.getComponent(UITransform)!.setContentSize(750 * cover, 1800 * cover);
        if (this.node.scene?.name === 'Main') {
            const scale = Math.min(1, size.width / 750);
            this.mainControls.forEach((authored, control) => {
                control.setPosition(authored.position.x * size.width / 750, authored.position.y * size.height / 1800, authored.position.z);
                control.setScale(authored.scale.x * scale, authored.scale.y * scale, authored.scale.z);
            });
            const logo = this.node.getChildByName('OriginalTitleLogo');
            if (logo) { logo.setPosition(0, size.height * .32); logo.setScale(scale, scale, 1); }
            const start = this.node.getChildByName('Button');
            if (start) {
                start.setPosition(0, -size.height * .26);
                start.getComponent(UITransform)!.setContentSize(500, 110);
                paperSurface(start, 500, 110, PORTRAIT.brown);
                const label = start.getChildByName('StartCaption')?.getComponent(Label);
                if (label) { label.fontSize = 42; label.enableOutline = false; }
            }
            ['EntryRewardButton', 'ShareButton', 'DesktopButton'].forEach((name, index) => {
                const button = this.node.getChildByName(name);
                if (button) { button.setPosition((index - 1) * 190 * scale, -size.height * .4); button.setScale(.82 * scale, .82 * scale, 1); }
            });
            this.node.getChildByName('SettingsButton')?.setPosition(-size.width / 2 + 64, size.height / 2 - 72);
            return;
        }
        const control = this.node.getChildByName('LoadingStatus') || this.node.getChildByName('Button');
        if (!control) return;
        const scale = Math.min(1, size.width / 750, size.height / 1100);
        control.setScale(scale, scale, 1);
        control.setPosition(0, -size.height * 0.325);
        this.renderProgress();
    }

    private renderProgress(): void {
        const fill = this.node.getChildByPath('LoadingStatus/Fill')?.getComponent(Sprite);
        if (fill) fill.fillRange = this.progress;
    }

    update(dt: number): void {
        this.elapsed += dt;
        const loading = this.node.getChildByName('LoadingStatus');
        const control = loading || this.node.getChildByName('Button');
        const queen = control?.getChildByName('Queen');
        if (!queen) return;
        const baseX = loading ? -282 + 564 * this.progress : 225;
        queen.setPosition(baseX + Math.sin(this.elapsed * 4) * 5, 8);
        queen.setRotationFromEuler(0, 0, Math.sin(this.elapsed * 4) * 9);
    }

    onDestroy(): void {
        this.node.off(Node.EventType.SIZE_CHANGED, this.layout, this);
        this.node.off(Node.EventType.TOUCH_END, this.retryLoading, this);
    }

    private openWorld(): void {
        if (this.opening) return;
        this.opening = true;
        const button = this.node.getChildByName('Button')?.getComponent(Button);
        if (button) button.interactable = false;
        loadGameThroughLoading();
    }
}
