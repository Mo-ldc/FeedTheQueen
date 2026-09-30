import { Color, isValid, Label, Node, Sprite, UITransform } from 'cc';
import { useDefaultSystemFont } from '../ui/DefaultSystemFont';
import { originalFrame } from './OriginalArt';

export interface BuildingReadoutLine { value: string; icon: string; }
const loadedIconPaths = new WeakMap<Node, string>();
const lastReadouts = new WeakMap<Node, string>();

/** Reuses the building's overhead caption node, but displays only values and item art. */
export function buildingReadout(parent: Node, name: string, lines: BuildingReadoutLine[], x: number, y: number, width = 330, size = 25): Node {
    let root = parent.getChildByName(name);
    if (!root) {
        root = new Node(name);
        root.layer = parent.layer;
        parent.addChild(root);
        root.addComponent(UITransform);
    }
    root.setPosition(x, y);
    root.active = lines.length > 0;
    const oldLabel = root.getComponent(Label);
    if (oldLabel) oldLabel.enabled = false;
    let signature = `${width},${size},${lines.length};`;
    for (let i = 0; i < lines.length; i++) signature += `${lines[i].value}|${lines[i].icon};`;
    if (lastReadouts.get(root) === signature) return root;
    lastReadouts.set(root, signature);
    root.getComponent(UITransform)?.setContentSize(width, Math.max(size + 6, lines.length * (size + 7)));
    const iconSize = size + 2;
    lines.forEach((line, index) => {
        const rowName = 'ValueIcon' + index;
        let row = root!.getChildByName(rowName);
        if (!row) { row = new Node(rowName); row.layer = root!.layer; root!.addChild(row); }
        row.active = true;
        row.setPosition(0, -index * (size + 7));
        let textNode = row.getChildByName('Value');
        if (!textNode) { textNode = new Node('Value'); textNode.layer = row.layer; row.addChild(textNode); textNode.addComponent(UITransform); textNode.addComponent(Label); }
        const label = textNode.getComponent(Label)!;
        useDefaultSystemFont(label);
        label.string = line.value;
        label.fontSize = size;
        label.lineHeight = size + 3;
        label.isBold = true;
        label.color = Color.WHITE;
        label.enableOutline = true;
        label.outlineColor = Color.BLACK;
        label.outlineWidth = 3;
        label.overflow = Label.Overflow.SHRINK;
        label.horizontalAlign = Label.HorizontalAlign.RIGHT;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        const textWidth = Math.min(width - iconSize - 6, Math.max(size, line.value.length * size * .61));
        const totalWidth = textWidth + 4 + iconSize;
        textNode.getComponent(UITransform)!.setContentSize(textWidth, size + 7);
        textNode.setPosition(-totalWidth / 2 + textWidth / 2, 0);
        let iconNode = row.getChildByName('Icon');
        if (!iconNode) { iconNode = new Node('Icon'); iconNode.layer = row.layer; row.addChild(iconNode); iconNode.addComponent(UITransform); iconNode.addComponent(Sprite); }
        iconNode.setPosition(totalWidth / 2 - iconSize / 2, 0);
        const sprite = iconNode.getComponent(Sprite)!;
        if (loadedIconPaths.get(iconNode) !== line.icon) {
            loadedIconPaths.set(iconNode, line.icon);
            sprite.spriteFrame = null;
            originalFrame(line.icon).then(frame => {
                if (!isValid(iconNode!, true) || loadedIconPaths.get(iconNode!) !== line.icon) return;
                sprite.sizeMode = Sprite.SizeMode.RAW;
                sprite.trim = false;
                sprite.spriteFrame = frame;
                const bounds = frame.originalSize;
                const scale = iconSize / Math.max(bounds.width, bounds.height, 1);
                iconNode!.setScale(scale, scale, 1);
            }).catch(console.error);
        }
    });
    for (const row of root.children) if (row.name.startsWith('ValueIcon')) row.active = Number(row.name.slice(9)) < lines.length;
    return root;
}
