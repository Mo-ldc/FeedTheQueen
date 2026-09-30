import { Button, Color, Graphics, Label, Node, UITransform } from 'cc';
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
    if (!node.getComponent(Graphics)) node.addComponent(Graphics);
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
    const graphics = node.getComponent(Graphics);
    const transform = node.getComponent(UITransform);
    if (!graphics || !transform) return;

    const width = transform.width;
    const height = transform.height;
    const state = `${width}|${height}|${selected}|${enabled}|${radius}`;
    if (choicePaint.get(node) === state) return;
    choicePaint.set(node, state);
    graphics.clear();
    graphics.fillColor = selected
        ? new Color(255, 222, 173)
        : enabled ? new Color(164, 130, 94) : new Color(104, 86, 67);
    graphics.roundRect(-width / 2, -height / 2, width, height, radius);
    graphics.fill();

    const labelNode = node.getChildByName('Label') || node.getChildByName('Caption');
    const label = labelNode?.getComponent(Label);
    if (label) {
        label.fontSize = 28;
        label.lineHeight = 34;
        label.isBold = false;
        label.color = selected ? new Color(79, 49, 29) : new Color(255, 241, 217);
        label.enableOutline = false;
    }
}

/** Matches the equal-width horizontal option row used by the western hauler nest. */
export function layoutUpgradeChoiceRow(nodes: Node[], y = -33, totalWidth = 620, height = 64): void {
    if (!nodes.length) return;
    // Keep every visible choice in one evenly spaced row, including four-way controls.
    const width = Math.min(194, totalWidth / nodes.length);
    const rowWidth = width * nodes.length;
    nodes.forEach((node, index) => {
        node.getComponent(UITransform)?.setContentSize(width, height);
        node.setPosition(-rowWidth / 2 + width * (index + 0.5), y);
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
}
