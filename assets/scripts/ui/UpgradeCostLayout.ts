import { Label, Node, UITransform } from 'cc';

/** The lower-right card area is 170 x 60. Every currency owns an icon/text cell. */
export function layoutUpgradeCosts(row: Node): void {
    const amounts = row.children.filter(n => /^Cost\d+$/.test(n.name) && n.active)
        .sort((a, b) => Number(a.name.slice(4)) - Number(b.name.slice(4)));
    const columns = amounts.length > 2 ? 2 : 1;
    const lines = Math.ceil(amounts.length / columns);
    amounts.forEach((amount, index) => {
        const icon = row.getChildByName('CostIcon' + amount.name.slice(4));
        if (!icon) return;
        const column = index % columns;
        const line = Math.floor(index / columns);
        const y = lines === 1 ? -36 : -21 - line * 30;
        const iconX = columns === 1 ? 28 : -3 + column * 84;
        const iconSize = columns === 1 ? 24 : 22;
        icon.setPosition(iconX, y);
        icon.getComponent(UITransform)!.setContentSize(iconSize, iconSize);
        // A left anchor keeps the gap independent of the amount's digit count.
        const transform = amount.getComponent(UITransform)!;
        transform.setAnchorPoint(0, 0.5);
        transform.setContentSize(columns === 1 ? 100 : 56, 28);
        amount.setPosition(iconX + iconSize / 2 + 4, y);
        const label = amount.getComponent(Label)!;
        label.horizontalAlign = Label.HorizontalAlign.LEFT;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.fontSize = amounts.length === 1 ? 28 : 22;
        label.lineHeight = 26;
        label.enableWrapText = false;
        label.overflow = Label.Overflow.SHRINK;
    });
}
