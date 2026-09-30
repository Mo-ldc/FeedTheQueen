/** All currently implemented economy tuning. Values are base values before future bonuses. */
export const ECONOMY = {
    initialResources: { nutrients: 0, larvae: 0, greyMatter: 0 },
    larvaProduction: {
        amount: 3, costBase: 2, costLinear: 2, costExponent: 1.8,
        roundingSteps: [[1e10,1e9],[1e9,1e8],[1e7,1e6],[1e6,1e5],[1e4,1e3],[1e3,1e2]],
    },
    upgradeEffects: {
        pileSize: 1, discoverySeconds: 1, multitasking: 1, extraPileChance: .1,
        haulerSpeed: 20, haulerCapacity: 1,
    },
};
export function larvaProductionCost(level:number):number {
    const rule=ECONOMY.larvaProduction;
    let cost=Math.round(rule.costBase+level*rule.costLinear+Math.pow(rule.costExponent,level));
    for(const [threshold,step] of rule.roundingSteps)if(cost>=threshold){cost=Math.floor(cost/step)*step;break;}
    return cost;
}
