import { FEEDING_RATE } from '../config/FeedingRateConfig';

interface SecondBucket {
    total: number;
    contributions: Record<number, number>;
    amounts: Record<number, number>;
}
const fresh = (): SecondBucket => ({total: 0, contributions: {}, amounts: {}});

/** Port of global.gd's two 60-second histories. Entries are aggregated, never nodes. */
export class FeedingRateLedger {
    private elapsed = 0;
    private second = 0;
    private readonly foods: SecondBucket[] = Array.from({length: FEEDING_RATE.windowSeconds}, fresh);
    private readonly totals: number[] = Array(FEEDING_RATE.windowSeconds).fill(0);

    snapshot():object {return JSON.parse(JSON.stringify({elapsed:this.elapsed,second:this.second,foods:this.foods,totals:this.totals}));}
    restore(value:unknown):void {
        const data=value as {elapsed:number;second:number;foods:SecondBucket[];totals:number[]};
        const nonnegative=(n:number)=>Number.isFinite(n)&&n>=0;
        const validMap=(m:Record<number,number>)=>m&&typeof m==='object'&&!Array.isArray(m)&&Object.keys(m).every(k=>Number.isInteger(+k)&&+k>=1&&nonnegative(m[+k]));
        if(!data||!nonnegative(data.elapsed)||data.elapsed>=1||!Number.isInteger(data.second)||data.second<0||data.second>=60
            ||!Array.isArray(data.foods)||data.foods.length!==60||!Array.isArray(data.totals)||data.totals.length!==60
            ||!data.totals.every(nonnegative)||!data.foods.every(b=>b&&nonnegative(b.total)&&validMap(b.contributions)&&validMap(b.amounts)))throw new Error('Invalid feeding history');
        this.elapsed=data.elapsed;this.second=data.second;
        data.foods.forEach((b,i)=>{this.foods[i]={total:b.total,contributions:{...b.contributions},amounts:{...b.amounts}};this.totals[i]=data.totals[i];});
    }

    advance(dt: number): void {
        if (!Number.isFinite(dt) || dt < 0) throw new Error('Invalid elapsed time');
        this.elapsed += dt;
        const steps = Math.floor(this.elapsed + 1e-9);
        if (!steps) return;
        this.elapsed = Math.max(0,this.elapsed-steps);
        if (steps >= FEEDING_RATE.windowSeconds) {
            for (let i = 0; i < this.foods.length; i++) { this.foods[i] = fresh(); this.totals[i] = 0; }
            this.second = (this.second + steps) % FEEDING_RATE.windowSeconds;
            return;
        }
        for (let i = 0; i < steps; i++) {
            this.second = (this.second + 1) % FEEDING_RATE.windowSeconds;
            this.foods[this.second] = fresh();
            this.totals[this.second] = 0;
        }
    }

    /** A contribution is a source attribution; finalNutrition may include multiple bonuses. */
    feed(foodId: number, baseNutrition: number, finalNutrition = baseNutrition,
        extraContributions: Readonly<Record<number, number>> = {}): void {
        if (!Number.isInteger(foodId) || foodId < 1 || !Number.isFinite(baseNutrition) || baseNutrition < 0 ||
            !Number.isFinite(finalNutrition) || finalNutrition < 0) throw new Error('Invalid feeding');
        this.addContribution(foodId, baseNutrition);
        for (const key of Object.keys(extraContributions)) this.addContribution(+key, extraContributions[+key]);
        this.totals[this.second] += finalNutrition;
    }

    private addContribution(id: number, value: number): void {
        if (!Number.isInteger(id) || id < 1 || !Number.isFinite(value) || value < 0) throw new Error('Invalid contribution');
        const bucket = this.foods[this.second];
        bucket.total += value;
        bucket.contributions[id] = (bucket.contributions[id] || 0) + value;
        bucket.amounts[id] = (bucket.amounts[id] || 0) + 1;
    }

    get rate(): number { return Math.trunc(this.totals.reduce((sum, value) => sum + value, 0)); }
    get contributions(): Record<number, number> {
        const result: Record<number, number> = {};
        for (const bucket of this.foods) for (const key of Object.keys(bucket.contributions))
            result[+key] = (result[+key] || 0) + bucket.contributions[+key];
        return result;
    }
    get amounts(): Record<number, number> {
        const result: Record<number, number> = {};
        for (const bucket of this.foods) for (const key of Object.keys(bucket.amounts))
            result[+key] = (result[+key] || 0) + bucket.amounts[+key];
        return result;
    }
}
