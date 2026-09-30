import { UI_RULES } from '../config/UIConfig';
import { CURRENCIES } from '../config/ItemConfig';
/** Number formatting and milestone curves ported from the original scripts. */
export function formatOriginal(value: number): string {
    const absolute = Math.abs(value);
    const unit=UI_RULES.numberUnits.find(unit=>absolute>=unit.value);
    const divisor=unit?.value||1;
    const scaled = value / divisor;
    const number = divisor > 1 && Math.abs(scaled) < UI_RULES.compactDecimalLimit ? Math.floor(scaled * UI_RULES.compactDecimalFactor) / UI_RULES.compactDecimalFactor : Math.floor(scaled);
    return `${number}${unit?.suffix||''}`;
}
const clamp = (v: number) => Math.max(0, Math.min(1, v));
export function milestoneProgress(rate: number, min: number, max: number, queen: boolean): number {
    if (rate < 1) return 0;
    if (rate <= min * UI_RULES.milestoneTinyProgress) return UI_RULES.milestoneTinyProgress;
    // Godot sets min=minval, max=maxval+minval, value=rate+minval here.
    // ProgressBar's visible fraction is therefore rate / maxval.
    if (queen) return rate <= min ? clamp(Math.max(rate, min / UI_RULES.queenBelowThresholdDivisor) / (min * UI_RULES.queenBelowThresholdDivisor)) : clamp(rate / max);
    return max > min ? clamp((rate - min) / (max - min)) : 0;
}
export class OriginalVisibility {
    hasHadBrain = false;
    // Product choice: show the zero-rate status panels from the first frame.
    growthUnlocked = true;
    update(brain: number, evolutionBuilt: boolean, runId = 1): void {
        this.hasHadBrain ||= brain > 0;
        // Keep the zero-rate HUD visible from the beginning of a run.
    }
    currencies(newDna: number): boolean[] { return CURRENCIES.map(item=>item.visibility==='always'||(item.visibility==='ever-owned'?this.hasHadBrain:newDna>0)); }
}
