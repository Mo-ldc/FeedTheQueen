import { Button, Color, Graphics, Label, Node, Sprite, UITransform } from 'cc';
import { useDefaultSystemFont } from './DefaultSystemFont';
const choicePaint = new WeakMap<Node, string>();

/** Reuse scene-authored controls so initialization never adds a second option row. */
export function createUpgradeChoice(parent: Node, name: string, text: string, action: () => void): Node {
    const matches = parent.children.filter(child => child.name === name);
    const node = matches.shift() || new Node(name);
    for (const duplicate of matches) {
        duplicate.active = false;
        duplicate.removeFromParent();
        duplicate.destroy();
    }
    node.layer = parent.layer;
    if (node.parent !== parent) parent.addChild(node);
    (node.getComponent(UITransform) || node.addComponent(UITransform)).setContentSize(194, 64);
    const oldBackground = node.getComponent(Sprite);
    if (oldBackground) oldBackground.enabled = false;
    const oldGraphic = node.getComponent(Graphics);
    if (oldGraphic) oldGraphic.enabled = false;
    let surface = node.getChildByName('ChoiceSurface');
    if (!surface) {
        surface = new Node('ChoiceSurface'); surface.layer = node.layer;
        node.addChild(surface); surface.setSiblingIndex(0);
        surface.addComponent(UITransform); surface.addComponent(Graphics);
    }
    const button = node.getComponent(Button) || node.addComponent(Button);
    button.transition = Button.Transition.NONE;
    const captions = node.children.filter(child => child.name === 'Label' || child.name === 'Caption');
    const caption = captions.shift() || new Node('Label');
    for (const duplicate of captions) {
        duplicate.active = false;
        duplicate.removeFromParent();
        duplicate.destroy();
    }
    caption.layer = node.layer;
    if (caption.parent !== node) node.addChild(caption);
    (caption.getComponent(UITransform) || caption.addComponent(UITransform)).setContentSize(186, 58);
    const label = caption.getComponent(Label) || caption.addComponent(Label);
    useDefaultSystemFont(label);
    label.string = text;
    choicePaint.delete(node);
    node.off(Button.EventType.CLICK);
    node.on(Button.EventType.CLICK, action);
    return node;
}

/** Shared rounded treatment for upgrade-panel option controls. */
export function styleUpgradeChoice(node: Node, selected: boolean, enabled = true, radius = 12): void {
    const surface = node.getChildByName('ChoiceSurface');
    const graphics = surface?.getComponent(Graphics);
    const transform = node.getComponent(UITransform);
    if (!graphics || !transform) return;

    const width = transform.width;
    const height = transform.height;
    surface!.getComponent(UITransform)!.setContentSize(width, height);
    const state = `${width}|${height}|${selected}|${enabled}|${radius}`;
    if (choicePaint.get(node) === state) return;
    choicePaint.set(node, state);
    graphics.clear();
    graphics.fillColor = selected ? new Color(133, 70, 45) : new Color(249, 231, 202);
    graphics.strokeColor = selected ? new Color(65, 35, 25) : new Color(139, 90, 58);
    graphics.lineWidth = selected ? 3 : 1;
    graphics.roundRect(-width / 2 + 3, -height / 2 + 2, width - 6, height - 4, 8);
    graphics.fill();
    graphics.stroke();

    const labelNode = node.getChildByName('Label') || node.getChildByName('Caption');
    const label = labelNode?.getComponent(Label);
    if (label) {
        label.fontSize = 28;
        label.lineHeight = 34;
        label.isBold = selected;
        label.color = !enabled ? new Color(121, 114, 102) : selected ? Color.WHITE : new Color(43, 36, 28);
        label.enableOutline = false;
    }
}

/** At most two touch targets per row; return space needed by the pinned header. */
export function layoutUpgradeChoiceRow(nodes: Node[], y = -33, totalWidth = 620, height = 64): number {
    if (!nodes.length) return 0;
    const columns = Math.min(2, nodes.length);
    const width = Math.min(310, totalWidth / columns);
    const rowWidth = width * columns;
    nodes.forEach((node, index) => {
        node.getComponent(UITransform)?.setContentSize(width, height);
        node.setPosition(-rowWidth / 2 + width * (index % columns + 0.5), y - Math.floor(index / columns) * (height + 8));
        const labelNode = node.getChildByName('Label') || node.getChildByName('Caption');
        const labelTransform = labelNode?.getComponent(UITransform);
        const label = labelNode?.getComponent(Label);
        if (labelTransform) labelTransform.setContentSize(width - 8, height - 6);
        if (label) {
            label.fontSize = 28;
            label.lineHeight = 34;
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            label.overflow = Label.Overflow.SHRINK;
            label.enableWrapText = false;
        }
        const tip=node.getChildByName('OptionTip');
        if(tip){tip.setPosition(width/2-17,0);if(labelTransform)labelTransform.width=width-42;labelNode?.setPosition(-14,0);}
    });
    return Math.ceil(nodes.length / columns) * (height + 8);
}
