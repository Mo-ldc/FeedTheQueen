import { Color, Graphics, Node, Sprite, UITransform } from 'cc';

/** Warm paper and ink from the EXE artwork, sized for touch controls. */
export const PORTRAIT = {
    ink: new Color(65, 35, 25),
    paper: new Color(249, 231, 202),
    sand: new Color(231, 192, 132),
    brown: new Color(133, 70, 45),
    muted: new Color(137, 114, 91),
};

export function paperSurface(node: Node, width: number, height: number, fill = PORTRAIT.paper): void {
    const sprite = node.getComponent(Sprite);
    if (sprite) sprite.enabled = false;
    let surface = node.getChildByName('PortraitSurface');
    if (!surface) {
        surface = new Node('PortraitSurface'); surface.layer = node.layer;
        node.addChild(surface); surface.setSiblingIndex(0);
        surface.addComponent(UITransform); surface.addComponent(Graphics);
    }
    surface.getComponent(UITransform)!.setContentSize(width, height);
    const g = surface.getComponent(Graphics)!;
    g.clear(); g.fillColor = fill; g.strokeColor = PORTRAIT.ink; g.lineWidth = 3;
    g.roundRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, 12); g.fill(); g.stroke();
    g.strokeColor = new Color(255, 246, 220, 190); g.lineWidth = 2;
    g.roundRect(-width / 2 + 7, -height / 2 + 7, width - 14, height - 14, 8); g.stroke();
}
