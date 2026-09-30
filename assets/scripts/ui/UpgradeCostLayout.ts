import { Label, Node, UITransform } from 'cc';

/** One clear price column on the right of each portrait upgrade row. */
export function layoutUpgradeCosts(row: Node): void {
    const amounts = row.children.filter(n => /^Cost\d+$/.test(n.name) && n.active)
        .sort((a, b) => Number(a.name.slice(4)) - Number(b.name.slice(4)));
    const columns = 1;
    const lines = Math.ceil(amounts.length / columns);
    amounts.forEach((amount, index) => {
        const icon = row.getChildByName('CostIcon' + amount.name.slice(4));
        if (!icon) return;
        const line = Math.floor(index / columns);
        const y = ((lines - 1) / 2 - line) * 28;
        const iconX = 162;
        const iconSize = 26;
        icon.setPosition(iconX, y);
        icon.getComponent(UITransform)!.setContentSize(iconSize, iconSize);
        // A left anchor keeps the gap independent of the amount's digit count.
        const transform = amount.getComponent(UITransform)!;
        transform.setAnchorPoint(0, 0.5);
        transform.setContentSize(124, 30);
        amount.setPosition(iconX + iconSize / 2 + 4, y);
        const label = amount.getComponent(Label)!;
        label.horizontalAlign = Label.HorizontalAlign.LEFT;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.fontSize = amounts.length === 1 ? 30 : 24;
        label.enableOutline = false;
        label.lineHeight = 26;
        label.enableWrapText = false;
        label.overflow = Label.Overflow.SHRINK;
    });
}
