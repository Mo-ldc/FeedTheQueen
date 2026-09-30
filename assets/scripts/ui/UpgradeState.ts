import { ECONOMY, larvaProductionCost } from '../config/EconomyConfig';
import { GENE_TAB_INDEX, TUNNELLER_TAB_INDEX, UPGRADE_GROUPS } from '../config/UpgradeConfig';
import { MAX_FISHING_BOATS } from '../core/FishingRules';

export type UpgradeItem = typeof UPGRADE_GROUPS[number]['items'][number];
export interface UpgradeResources { nutrients: number; larvae?: number; greyMatter?: number; }
export type PurchaseResult = 'purchased' | 'locked' | 'maxed' | 'insufficient' | 'unknown';

/** Pure transaction model for the original upgrade groups. No scene or save ownership. */
export class UpgradeState {
    public activeTunnellers=0;
    public queenLevel=0;
    public hasHadBrain=false;
    public spores=[false,false,false,false];
    public throwerPriority=0;
    public eastPriority=0;
    public tunnelPriority=0;
    public totalLarvae=0;
    public genes:Record<string,boolean>={};
    public readonly sporeUpgrades=['SporesFocus','SporesEuphoria','SporesVitamins','SporesPurification'];
    private cachedSporeKey = '';
    private cachedSporeEffects: {active: boolean[]; efficiency: number; sporeWorkers: number; focus: number; euphoria: number; verdant: number; clear: number} | null = null;
    public toggleSpore(index:number):boolean {
        if(!Number.isInteger(index)||index<0||index>3||!this.level('mushrooms_'+this.sporeUpgrades[index]))return false;
        this.spores[index]=!this.spores[index];return true;
    }
    public get sporeEffects(){
        let mask = 0;
        for (let i = 0; i < 4; i++) if (this.spores[i] && this.level('mushrooms_' + this.sporeUpgrades[i]) > 0) mask |= 1 << i;
        const key = `${mask}|${this.level('mushrooms_SpawnMycologist')}|${!!this.genes.mycellium}|${this.level('mine_mushrooms') > 0}`;
        if (key === this.cachedSporeKey && this.cachedSporeEffects) return this.cachedSporeEffects;
        this.cachedSporeKey = key;
        const active=this.spores.map((on,i)=>on&&this.level('mushrooms_'+this.sporeUpgrades[i])>0);
        const kinds=active.filter(Boolean).length,workers=this.level('mushrooms_SpawnMycologist');
        const efficiency=kinds?Math.min(1,workers/(kinds*6))+(this.genes.mycellium ? .075*kinds : 0)+(this.level('mine_mushrooms') ? .2 : 0):0;
        return this.cachedSporeEffects = {active,efficiency,sporeWorkers:Math.min(workers,kinds*6),
            focus:active[0]?4*efficiency:0,euphoria:active[1]?efficiency:0,
            verdant:active[2]?Math.round((efficiency>1?3*efficiency:1+2*efficiency)*100)/100:1,
            clear:active[3]?Math.round((efficiency>1?2*efficiency:1+efficiency)*100)/100:1};
    }
    private wallet: UpgradeResources = { ...ECONOMY.initialResources };
    private levels: Record<string, number> = {};

    public get resources(): UpgradeResources { return { ...this.wallet }; }
    public level(id: string): number { return this.levels[id] || 0; }
    public item(id: string): UpgradeItem | undefined {
        for (const group of UPGRADE_GROUPS) {
            const found = group.items.find(item => item.id === id);
            if (found) return found;
        }
        return undefined;
    }

    public setResources(resources: UpgradeResources): void {
        if ([resources.nutrients, resources.larvae, resources.greyMatter].some(value => !Number.isFinite(value) || value < 0)) {
            throw new Error('Upgrade resources must be finite and non-negative.');
        }
        if (!Number.isInteger(resources.larvae) || !Number.isInteger(resources.greyMatter)) {
            throw new Error('Larvae and grey matter must be integers.');
        }
        this.totalLarvae+=Math.max(0,resources.larvae-this.wallet.larvae);
        this.wallet = { ...resources };
        this.hasHadBrain ||= resources.greyMatter>0;
    }

    public isUnlocked(item: UpgradeItem): boolean {
        // Original upgrades_manager.gd gates these behind permanent specialisations.
        const gates:Record<string,string>={queen_Rebirth:'rebirth',farm_MeatBugs:'meat_farm',evolution_BuildingMushrooms:'laboratory',orchard_MoreTreesExtra:'forest',evolution_Calcul:'sacrifice',queen_AffinityHeat:'superhot',cuisine_RecipeFrostfire:'harmony',cuisine_RecipeScarlet:'scarlet',evolution_BuildingGemini:'gemini',evolution_BuildingMine:'mine',evolution_BuildingFishing:'fishmonger',evolution_BuildingTunnellers:'tunnellers',haulers_HaulerCapacityHerculean:'herculean',gemini_GeminiCapacityHerculean:'herculean',fishing_ghostship:'ghost_ship'};
        if(gates[item.id]&&!this.genes[gates[item.id]])return false;
        if(item.id==='fishing_mode_pearls'&&!this.level('mine_nacre'))return false;
        for(const [prefix,building]of [['gemini','Gemini'],['cuisine','Cuisine'],['mine','Mine'],['fishing','Fishing'],['tunnellers','Tunnellers']])if(item.id.startsWith(prefix+'_')&&!this.level('evolution_Building'+building))return false;
        if (item.id.startsWith('foragers_') && !this.level('queen_BuildingForagers')) return false;
        if (item.id.startsWith('haulers_') && !this.level('queen_BuildingHaulers')) return false;
        if (item.id.startsWith('evolution_') && !this.level('queen_BuildingEvolutionChamber')) return false;
        if (item.id.startsWith('orchard_') && !this.level('evolution_BuildingOrchard')) return false;
        if (item.id.startsWith('farm_') && !this.level('evolution_BuildingFarm')) return false;
        if (item.id.startsWith('mushrooms_') && !this.level('evolution_BuildingMushrooms')) return false;
        if (item.id.startsWith('throwers_') && !this.level('evolution_BuildingThrowers')) return false;
        if (item.id.startsWith('hunters_') && !this.level('evolution_BuildingHunters')) return false;
        return item.prerequisites.every(path => this.level(path.replace('.tres', '').replace('/', '_')) > 0);
    }

    public isMaxed(item: UpgradeItem): boolean {
        const fishingBoats=this.level('fishing_firstboat')+this.level('fishing_extra_boat')+this.level('fishing_ghostship');
        if(item.id==='fishing_extra_boat')return fishingBoats>=MAX_FISHING_BOATS;
        if(item.id==='fishing_ghostship'&&fishingBoats>=MAX_FISHING_BOATS)return true;
        return item.id!=='queen_Rebirth' && item.nutrients.length > 0 && this.level(item.id) >= item.nutrients.length;
    }

    public cost(item: UpgradeItem): UpgradeResources {
        let nutrients = item.nutrients[this.level(item.id)] || 0;
        if (item.id === 'queen_SpawnLarvae') {
            const n = this.level(item.id);
            nutrients = larvaProductionCost(n);

        }
        if(item.id==='queen_Rebirth')nutrients=100000*(this.level(item.id)+1);
        if(item.id==='fishing_extra_boat')nutrients=10000000*(this.level(item.id)+1);
        return { nutrients, larvae: item.larvae, greyMatter: item.greyMatter };
    }

    public canAfford(item: UpgradeItem): boolean {
        const cost = this.cost(item);
        return Number.isFinite(cost.nutrients) && this.wallet.nutrients >= cost.nutrients
            && this.wallet.larvae >= cost.larvae && this.wallet.greyMatter >= cost.greyMatter;
    }

    public purchase(id: string): PurchaseResult {
        return this.purchaseInternal(id, false);
    }

    /** Purchase one unlocked level while waiving all resource costs after an ad. */
    public purchaseFree(id: string): PurchaseResult {
        return this.purchaseInternal(id, true);
    }

    private purchaseInternal(id: string, free: boolean): PurchaseResult {
        const item = this.item(id);
        if (!item) return 'unknown';
        if (!this.isUnlocked(item)) return 'locked';
        if (this.isMaxed(item)) return 'maxed';
        if (!free && !this.canAfford(item)) return 'insufficient';
        const cost = this.cost(item);
        if (!free) {
            this.wallet.nutrients -= cost.nutrients;
            this.wallet.larvae -= cost.larvae;
            this.wallet.greyMatter -= cost.greyMatter;
        }
        this.levels[id] = this.level(id) + 1;
        if (id === 'queen_SpawnLarvae') {this.wallet.larvae += ECONOMY.larvaProduction.amount;this.totalLarvae+=ECONOMY.larvaProduction.amount;}
        if (id === 'queen_Nursery') {const n=8+this.queenLevel*2;this.wallet.larvae+=n;this.totalLarvae+=n;}
        if (id === 'evolution_Calcul') this.wallet.greyMatter++;
        return 'purchased';
    }
    public groupUnlocked(index:number):boolean {
        if(index===0||index===GENE_TAB_INDEX)return true;
        if(index===TUNNELLER_TAB_INDEX)return this.level('evolution_BuildingTunnellers')>0;
        return this.level(['','queen_BuildingForagers','queen_BuildingHaulers','queen_BuildingEvolutionChamber','evolution_BuildingOrchard','evolution_BuildingFarm','evolution_BuildingMushrooms','evolution_BuildingThrowers','evolution_BuildingHunters','evolution_BuildingGemini','evolution_BuildingCuisine','evolution_BuildingMine','evolution_BuildingFishing'][index])>0;
    }

    public snapshot():{wallet:UpgradeResources;levels:Record<string,number>;hasHadBrain:boolean;spores?:boolean[];throwerPriority?:number;eastPriority?:number;tunnelPriority?:number;totalLarvae?:number} {return {wallet:this.resources,levels:{...this.levels},hasHadBrain:this.hasHadBrain,spores:[...this.spores],throwerPriority:this.throwerPriority,eastPriority:this.eastPriority,tunnelPriority:this.tunnelPriority,totalLarvae:this.totalLarvae};}
    public restore(value:unknown):void {
        const data=value as {wallet:UpgradeResources;levels:Record<string,number>;hasHadBrain?:boolean;spores?:boolean[];throwerPriority?:number;eastPriority?:number;tunnelPriority?:number;totalLarvae?:number};
        if(data?.throwerPriority!==undefined&&![0,1,2,3].includes(data.throwerPriority))throw new Error('Invalid thrower priority');
        if(data?.spores&&(!Array.isArray(data.spores)||data.spores.length!==4||data.spores.some(v=>typeof v!=='boolean')))throw new Error('Invalid spores');
        if(!data?.wallet||!data.levels||typeof data.levels!=='object'||Array.isArray(data.levels))throw new Error('Invalid upgrade save');
        const levels:Record<string,number>={};let legacyRefund=0;
        for(const [id,level] of Object.entries(data.levels)){
            // Migrate old saves that contain the removed 10B queen upgrade.
            if(id==='queen_TheEnd'){
                if(!Number.isSafeInteger(level)||level<0||level>1)throw new Error('Invalid legacy upgrade level');
                legacyRefund=10000000000*level;continue;
            }
            const item=this.item(id);
            if(!item||!Number.isSafeInteger(level)||level<0||level>100000||(id==='fishing_extra_boat'&&level>MAX_FISHING_BOATS)||(id!=='queen_Rebirth'&&id!=='fishing_extra_boat'&&item.nutrients.length&&level>item.nutrients.length))throw new Error('Invalid upgrade level: '+id);
            levels[id]=level;
        }
        const fishingBoats=(levels.fishing_firstboat||0)+(levels.fishing_extra_boat||0)+(levels.fishing_ghostship||0);
        if(fishingBoats>MAX_FISHING_BOATS)throw new Error('Invalid fishing boat count');
        if(data.totalLarvae!==undefined&&(!Number.isSafeInteger(data.totalLarvae)||data.totalLarvae<0))throw new Error('Invalid total larvae');
        if(data.tunnelPriority!==undefined&&![0,1,2,3].includes(data.tunnelPriority))throw new Error('Invalid tunnel priority');
        this.setResources(legacyRefund?{...data.wallet,nutrients:data.wallet.nutrients+legacyRefund}:data.wallet);this.levels=levels;
        this.totalLarvae=data.totalLarvae??Math.max(data.wallet.larvae,(levels.queen_SpawnLarvae||0)*3+(levels.queen_Nursery?8:0));
        this.tunnelPriority=data.tunnelPriority||0;
        this.spores=data.spores?[...data.spores]:[false,false,false,false];
        this.throwerPriority=data.throwerPriority||0;
        if(data.eastPriority!==undefined&&![0,1,2,3].includes(data.eastPriority))throw new Error('Invalid east priority');
        this.eastPriority=data.eastPriority||0;
        this.hasHadBrain ||= data.hasHadBrain===true||Object.keys(levels).some(id=>levels[id]>0&&this.item(id)!.greyMatter>0);
    }

    /** World controllers consume these values when worker behaviour is connected. */
    public get effects() {
        return {
            foragers: this.level('foragers_SpawnForager'),
            haulers: this.level('haulers_SpawnHauler'),
            pileSizeBonus: this.level('foragers_BiggerPiles') * ECONOMY.upgradeEffects.pileSize,
            discoveryIntervalReduction: this.level('foragers_FasterDiscovery') * ECONOMY.upgradeEffects.discoverySeconds,
            multitaskingBonus: this.level('foragers_Multitasking') * ECONOMY.upgradeEffects.multitasking,
            extraPileChance: this.level('foragers_ExtraBush') * ECONOMY.upgradeEffects.extraPileChance,
            haulerSpeedBonus: (this.level('haulers_HaulerSpeed')-this.level('haulers_HaulerCapacityHerculean')) * ECONOMY.upgradeEffects.haulerSpeed,
            haulerCapacityBonus: (this.level('haulers_HaulerCapacity')+this.level('haulers_HaulerCapacityHerculean')) * ECONOMY.upgradeEffects.haulerCapacity,
            closestDeliveryUnlocked: this.level('haulers_CarrierClosest') > 0,
            maxCombo:this.level('foragers_ComboPiles'),
        };
    }
}
