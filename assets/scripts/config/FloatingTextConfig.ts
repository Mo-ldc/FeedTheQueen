import { FOOD_ITEMS } from './ItemConfig';

/** Original float/color behavior with the requested 24–50 font-size range. */
export const FLOATING_TEXT = {
    duration: 2,
    alpha: .7,
    blueberryAlpha: 1, // Preserve #2B66C5 against the current bright map.
    poolSize: 48,
    minFontSize: 24,
    maxFontSize: 50,
    cocosOutlineWidthFactor: .05,
    glyphSpacing: 4,
    baseSpread: 30,
    rise: 100,
    outlineColor: '5c5c5c',
} as const;

export function floatingTextStyle(nutrition: number, foodId: number): {
    text: string; color: string; fontSize: number; outlineSize: number; spread: number;
} {
    const progress = Math.pow(Math.max(0, Math.min(1, (nutrition - 1) / 9999)), .4);
    const baseScale = 1 + 2.5 * progress;
    const spread = FLOATING_TEXT.baseSpread * Math.pow(baseScale, 1.5);
    const fontSize = FLOATING_TEXT.minFontSize + (FLOATING_TEXT.maxFontSize - FLOATING_TEXT.minFontSize) * progress;
    return {
        text: `+${Math.trunc(nutrition)}`,
        color: FOOD_ITEMS.find(food => food.id === foodId)?.color ?? 'ffffff',
        fontSize: Math.trunc(fontSize),
        outlineSize: nutrition <= 10 ? 20 : nutrition <= 1000 ? 32 : 40,
        spread,
    };
}
