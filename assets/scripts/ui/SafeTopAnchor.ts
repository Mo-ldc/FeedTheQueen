import { _decorator, Canvas, Component, Enum, isValid, Node, Size, sys, UITransform, Vec3 } from 'cc';
const { ccclass, property } = _decorator;
enum TopSide { Left, Center, Right }

/** Keep scene-authored offsets; only compensate for screen size and safe-area edges. */
@ccclass('SafeTopAnchor')
export class SafeTopAnchor extends Component {
    @property({ type: Enum(TopSide), displayName: '顶部对齐方向' }) side = TopSide.Center;
    @property({ displayName: '编辑时画布尺寸', tooltip: '节点位置以此画布尺寸为基准，运行时只补偿屏幕尺寸差值。' }) referenceSize = new Size(750, 1800);
    @property({ displayName: '避开刘海安全区' }) useSafeArea = true;
    private canvas: Node | null = null;
    private authoredPosition = new Vec3();

    onLoad(): void {
        this.authoredPosition.set(this.node.position);
        for (let parent = this.node.parent; parent; parent = parent.parent) {
            if (parent.getComponent(Canvas)) { this.canvas = parent; break; }
        }
        this.canvas?.on(Node.EventType.SIZE_CHANGED, this.align, this);
        this.align();
    }

    public align(): void {
        const size = this.canvas?.getComponent(UITransform);
        if (!size) return;
        const safe = sys.getSafeAreaRect(false);
        const topInset = this.useSafeArea ? Math.max(0, size.height - safe.y - safe.height) : 0;
        let dx = 0;
        if (this.side === TopSide.Left) dx = -(size.width - this.referenceSize.width) / 2 + (this.useSafeArea ? Math.max(0, safe.x) : 0);
        if (this.side === TopSide.Right) dx = (size.width - this.referenceSize.width) / 2 - (this.useSafeArea ? Math.max(0, size.width - safe.x - safe.width) : 0);
        this.node.setPosition(this.authoredPosition.x + dx, this.authoredPosition.y + (size.height - this.referenceSize.height) / 2 - topInset, this.authoredPosition.z);
    }

    onDestroy(): void { if (this.canvas && isValid(this.canvas, true)) this.canvas.off(Node.EventType.SIZE_CHANGED, this.align, this); }
}
