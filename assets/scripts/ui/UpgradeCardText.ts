/** Purchases that add entities rather than improve an attribute. */
const QUANTITY_UPGRADES = new Set([
    'orchard_MoreTrees',
    'orchard_MoreTreesExtra',
    'farm_MoreBugs',
    'cuisine_SousChef',
    'fishing_firstboat',
    'fishing_extra_boat',
    'fishing_ghostship',
    'tunnellers_tunneller',
    'queen_Rebirth',
]);

export function upgradeCountCaption(id: string, maxed = false): string {
    if (maxed) return '已满级';
    const quantity = /_(Spawn|Building)/.test(id) || QUANTITY_UPGRADES.has(id);
    return quantity ? '当前数量' : '当前等级';
}
