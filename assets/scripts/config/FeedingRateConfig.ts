/** Values taken from global.gd's 60 one-second buckets and HUD scripts. */
export const FEEDING_RATE = {
    windowSeconds: 60,
    foodRowHeight: 39,
    buffSize: 35,
    buffSizeSix: 30,
    buffSizeSeven: 25,
    panelWidth: 238,
} as const;

export const RATE_BUFFS = [
    {key: 'heat', name: '酷热', contributionId: 24},
    {key: 'sour', name: '酸涩', contributionId: 27},
    {key: 'cold', name: '严寒', contributionId: 25},
    {key: 'frostburn', name: '霜燃', contributionId: 26},
    {key: 'ecstasy', name: '迷醉', contributionId: 29},
    {key: 'shine', name: '虹彩', contributionId: 30},
    {key: 'umami', name: '鲜味', contributionId: 28},
] as const;

/** Food IDs follow food_data.gd. Display names are used only by the rate tooltip. */
export const FOOD_NAMES = [
    '苹果','金苹果','蓝莓','冰寒莓果','辣椒','柑橘','星果','蜜露','辣酱',
    '肉丸','沙丁鱼','章鱼','珍珠','鸡油菌','蜜恋糖苹果','鎏金蜜苹果','炙烤肉串','烈焰冰淇淋','绯红之萃',
] as const;
