import { _decorator, Color, Component, Graphics, Node, UITransform } from 'cc';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

/** Editable solid surfaces for menu shading and supplied artwork's caption patch. */
@ccclass('MenuSolidFill')
@executeInEditMode
@requireComponent(UITransform)
@requireComponent(Graphics)
export class MenuSolidFill extends Component {
    @property(Color) color = new Color(0, 0, 0, 135);
    onEnable(): void { this.node.on(Node.EventType.SIZE_CHANGED, this.draw, this); this.draw(); }
    onDisable(): void { this.node.off(Node.EventType.SIZE_CHANGED, this.draw, this); }
    onRestore(): void { this.draw(); }
    private draw(): void {
        const size = this.getComponent(UITransform)!, g = this.getComponent(Graphics)!;
        g.clear(); g.fillColor = this.color;
        g.rect(-size.width / 2, -size.height / 2, size.width, size.height); g.fill();
    }
}
