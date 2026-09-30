import type { AdvancedSnapshot } from "../world/AdvancedFacilities";
import type { ContinuitySnapshot } from "../world/WorldContinuity";
import type { GreyMatterFlight } from '../world/GreyMatterDelivery';
import { sys } from 'cc';
import { UpgradeState } from '../ui/UpgradeState';
import { FeedingRateLedger } from '../world/FeedingRateLedger';
import { FeedingModel, FeedingSnapshot } from './FeedingModel';
import { ProgressionModel } from './ProgressionModel';
import { SaveRepository } from './SaveRepository';
import { GeneModel, GeneSnapshot } from './GeneModel';
import type { KitchenSnapshot } from '../world/Kitchen';
import type { FishingSnapshot } from '../world/Fishing';
export interface SavedFlight {x:number;y:number;food:number;startX?:number;startY?:number;age?:number;delay?:number;duration?:number;height?:number;targetX?:number;targetY?:number;route?:{kind:"relay"|"tunnel"|"receiver"|"storage";name?:string;exitX?:number;exitY?:number};}
export interface ThrowerSnapshot {x:number;y:number;cargo:number;food:number;stamina:number;sleep:number;throwLeft:number;relayLeft:number;}
export interface HunterTrapSnapshot {phase:'landing'|'waiting'|'caught';x:number;y:number;startX:number;startY:number;targetX:number;targetY:number;angle:number;age:number;big:boolean;production:number;rot:number;arrival:number;preyX:number;preyY:number;amount:number;}
export interface ColonySnapshot {
    upgrades:ReturnType<UpgradeState['snapshot']>;progression:{queenLevel:number;dnaLevel:number;dna:number};
    tastes:FeedingSnapshot;ledger:object;playSeconds:number;totalNutrition:number;
    feastCharges?:number;
    advanced?:AdvancedSnapshot;
    continuity?:ContinuitySnapshot;
    history?:{noCarrier:boolean;larvaePurchases:number};
    pendingRewards?:number[];
    greyMatterFlights?: GreyMatterFlight[];
    evolution?: { brainScale: number };
    genes?:GeneSnapshot;
    kitchen?:KitchenSnapshot;
    fishing?:FishingSnapshot;
    orchard?:{food:number;amount:number;reserved:number;elapsed:number};
    farm?:{food:number;amount:number;reserved:number;elapsed:number;next:number};
    mushrooms?:{amount:number;reserved:number;elapsed:number;clocks:number[]};
    throwers?:ThrowerSnapshot[];
    hunters?:{traps:HunterTrapSnapshot[];bait?:number};
    foodWorld?:{bushes:{x:number;y:number;amount:number;food:number;owner:number;rainbow?:boolean}[];flights:SavedFlight[];refillElapsed:number;foragerFood:number};
}
export function validateColony(value:unknown):ColonySnapshot {
    const v=value as ColonySnapshot;
    if(!v||![v.playSeconds,v.totalNutrition].every(n=>Number.isFinite(n)&&n>=0))throw new Error('Invalid colony');
    if(v.feastCharges!==undefined&&(!Number.isSafeInteger(v.feastCharges)||v.feastCharges<0))throw new Error('Invalid feast charges');
    if(v.advanced&&(![v.advanced.active,v.advanced.known].every(n=>Number.isSafeInteger(n)&&n>=0)||!Number.isFinite(v.advanced.clock)||!Array.isArray(v.advanced.hatches)||!Array.isArray(v.advanced.tunnels)||v.advanced.hatches.some(h=>![h.x,h.y,h.age].every(Number.isFinite)||h.age<0||h.age>=8)||v.advanced.tunnels.some(t=>![...t.entry,...t.exit,t.age,t.clock,t.transported,t.source.x,t.source.y].every(Number.isFinite))))throw Error("Invalid tunnels");
    if(v.continuity&&(!Array.isArray(v.continuity.actors)||v.continuity.actors.length>100000||v.continuity.actors.some(r=>!r||!r.fields||!Array.isArray(r.pose)||r.pose.some(p=>![...p.p,...p.s,p.a].every(Number.isFinite)))))throw Error("Invalid continuity");
    if(v.history&&(typeof v.history.noCarrier!=="boolean"||!Number.isSafeInteger(v.history.larvaePurchases)||v.history.larvaePurchases<0))throw Error("Invalid history");
    new UpgradeState().restore(v.upgrades);new ProgressionModel().restore(v.progression);
    new FeedingModel().restore(v.tastes);new FeedingRateLedger().restore(v.ledger);
    if(v.genes){new GeneModel().restore(v.genes);if(v.genes.available>v.progression.dnaLevel)throw new Error('Gene DNA exceeds earned DNA');}
    const count=(n:number)=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;
    if(v.kitchen){const k=v.kitchen;if(!k.inputs||Array.isArray(k.inputs)||Object.entries(k.inputs).some(([f,n])=>![1,2,4,5,8,9,10].includes(+f)||!count(n))||!Array.isArray(k.outputs)||k.outputs.length!==4||!k.outputs.every(count)||!Array.isArray(k.recipes)||k.recipes.length!==4||k.recipes.some(x=>typeof x!=='boolean')||!Number.isFinite(k.clock)||k.clock<0||k.clock>=1)throw new Error('Invalid kitchen');}
    if(v.fishing){const f=v.fishing;if(![0,1,2,3].includes(f.mode)||!count(f.bait)||!count(f.stock)||!Array.isArray(f.boats)||f.boats.length>10000||f.boats.some(b=>!b||!['prepare','sail','unload','wait'].includes(b.phase)||![b.age,b.x,b.y,b.targetX,b.targetY].every(Number.isFinite)||!Number.isFinite(b.duration)||b.duration<10||b.duration>50||![b.amount,b.bonus,b.sent,b.bonusSent].every(count)||b.sent>b.amount||b.bonusSent>b.bonus))throw new Error('Invalid fishing');}
    if(v.pendingRewards&&(!Array.isArray(v.pendingRewards)||v.pendingRewards.length>12||!v.pendingRewards.every(n=>Number.isFinite(n)&&n>=0)))throw new Error('Invalid pending rewards');
    if(v.evolution&&(!Number.isFinite(v.evolution.brainScale)||v.evolution.brainScale<.5||v.evolution.brainScale>100))throw new Error('Invalid evolution scale');
    if(v.greyMatterFlights&&(!Array.isArray(v.greyMatterFlights)||v.greyMatterFlights.length>12||v.greyMatterFlights.some(f=>!f||![f.age,f.duration,f.startX,f.startY,f.endX,f.endY,f.curveHeight,f.amplitude,f.frequency,f.hudBend].every(Number.isFinite)||f.duration<20||f.duration>30||f.age<0||f.age>=f.duration+1||f.curveHeight<50||f.curveHeight>200||f.amplitude<20||f.amplitude>40||f.frequency<2||f.frequency>4||Math.abs(f.hudBend)>100)))throw new Error('Invalid grey matter flights');
    if(v.orchard&&(![1,4,5].includes(v.orchard.food)||![v.orchard.amount,v.orchard.reserved].every(n=>Number.isSafeInteger(n)&&n>=0)||!Number.isFinite(v.orchard.elapsed)||v.orchard.elapsed<0))throw new Error('Invalid orchard');
    if(v.farm&&(![8,9,10].includes(v.farm.food)||![v.farm.amount,v.farm.reserved,v.farm.next].every(n=>Number.isSafeInteger(n)&&n>=0)||!Number.isFinite(v.farm.elapsed)||v.farm.elapsed<0))throw new Error('Invalid farm');
    if(v.mushrooms){const m=v.mushrooms;if(![m.amount,m.reserved].every(n=>Number.isSafeInteger(n)&&n>=0)||!Number.isFinite(m.elapsed)||m.elapsed<0||!Array.isArray(m.clocks)||m.clocks.length>100000||!m.clocks.every(n=>Number.isFinite(n)&&n>=0&&n<6))throw new Error('Invalid mushrooms');}
    if(v.throwers&&(!Array.isArray(v.throwers)||v.throwers.length>100000||!v.throwers.every(w=>w&&[w.x,w.y].every(Number.isFinite)&&Number.isInteger(w.cargo)&&w.cargo>=0&&w.cargo<=20&&Number.isInteger(w.food)&&w.food>=1&&w.food<=19&&Number.isInteger(w.stamina)&&w.stamina>=0&&w.stamina<=50&&[w.sleep,w.throwLeft,w.relayLeft].every(n=>Number.isFinite(n)&&n>=0&&n<=10))))throw new Error('Invalid throwers');
    if(v.hunters?.bait!==undefined&&(!Number.isSafeInteger(v.hunters.bait)||v.hunters.bait<0||v.hunters.bait>100))throw new Error('Invalid trap bait');
    if(v.hunters&&(!Array.isArray(v.hunters.traps)||v.hunters.traps.length>20000||!v.hunters.traps.every(t=>t&&['landing','waiting','caught'].includes(t.phase)&&typeof t.big==='boolean'&&[t.x,t.y,t.startX,t.startY,t.targetX,t.targetY,t.angle,t.preyX,t.preyY].every(Number.isFinite)&&Number.isFinite(t.age)&&t.age>=0&&t.age<=60&&[30,60].includes(t.rot)&&Number.isFinite(t.arrival)&&t.arrival>=10&&t.arrival<=33.75&&Number.isInteger(t.production)&&t.production>=1&&t.production<=75&&Number.isInteger(t.amount)&&t.amount>=0&&t.amount<=t.production&&(t.phase==='caught'||t.amount===0))))throw new Error('Invalid hunter traps');
    if(v.foodWorld){
        const w=v.foodWorld,position=(b:{x:number;y:number;food:number})=>b&&Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isInteger(b.food)&&b.food>=1&&b.food<=19;
        if(![1,3,6].includes(w.foragerFood)||!Number.isFinite(w.refillElapsed)||w.refillElapsed<0||!Array.isArray(w.bushes)||!Array.isArray(w.flights)
            ||w.bushes.length>10000||w.flights.length>10000||!w.bushes.every(b=>position(b)&&Number.isInteger(b.amount)&&b.amount>0&&b.amount<=1000&&Number.isInteger(b.owner)&&b.owner>=-1)
            ||!w.flights.every(f=>position(f)&&[f.startX,f.startY,f.age,f.delay,f.duration,f.height,f.targetX,f.targetY].every(n=>n===undefined||Number.isFinite(n))&&(f.duration===undefined||f.duration>0)&&(f.age===undefined||f.age>=0)&&(f.delay===undefined||f.delay>=0)&&(!f.route||["relay","tunnel","receiver","storage"].includes(f.route.kind))))throw new Error('Invalid world food snapshot');
    }
    return v;
}
export const colonySave=new SaveRepository<ColonySnapshot>(sys.localStorage,validateColony);
