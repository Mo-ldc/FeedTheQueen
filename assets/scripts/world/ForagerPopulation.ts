import { playOriginalSound } from "../core/OriginalSound";
import { preferences } from '../core/PlayerMeta';
import { _decorator, Component, Node, Prefab, instantiate, isValid, AudioClip, AudioSource } from 'cc';
import { FacilityUpgradePanel } from '../ui/FacilityUpgradePanel';
import { WORLD } from '../config/WorldConfig';
import { BUILDING_POSITIONS } from '../config/MapConfig';
import { BlueberryFeeding } from './BlueberryFeeding';
import { Forager } from './Forager';
import { WorldLayers } from './WorldLayers';
import { reserveWorldSpawn } from './WorldSpawnQueue';
const {ccclass,property}=_decorator;

/** Number of active workers mirrors SpawnForager level; their bushes use feeding's economy. */
@ccclass('ForagerPopulation')
export class ForagerPopulation extends Component {
    @property(Prefab) foragerPrefab:Prefab|null=null;
    @property(FacilityUpgradePanel) upgrades:FacilityUpgradePanel|null=null;
    @property(BlueberryFeeding) feeding:BlueberryFeeding|null=null;
    @property(AudioClip) discoverySound:AudioClip|null=null;
    private workers:Forager[]=[];
    private ready=false;
    onEnable():void {this.upgrades?.node.on('upgrade-purchased',this.onPurchase,this);}
    onDisable():void {this.upgrades?.node.off('upgrade-purchased',this.onPurchase,this);}
    start():void {
        if(!this.foragerPrefab||!this.upgrades||!this.feeding){console.error('ForagerPopulation: missing scene references');return;}
        this.node.getComponent(WorldLayers)!.ensureLayers();
        this.ready=true;this.synchronize();
    }
    private onPurchase(event:{id:string}):void {
        if(event.id.startsWith('foragers_')||event.id==='queen_BuildingForagers'||event.id==='genes_changed')this.synchronize();
    }
    public synchronize():void {
        if(!this.ready||!this.foragerPrefab||!this.feeding||!this.upgrades)return;
        const effects=this.upgrades.upgradeState.effects;
        this.workers=this.workers.filter(w=>isValid(w.node,true));
        const actors=this.node.getComponent(WorldLayers)!.actors;
        while(this.workers.length<effects.foragers){
            if(!reserveWorldSpawn(this,()=>this.synchronize()))break;
            const n=instantiate(this.foragerPrefab);n.name="Forager"+this.workers.length;actors.addChild(n);
            n.setPosition(...BUILDING_POSITIONS.foragers,0);
            const worker=n.getComponent(Forager)!;
            const owner=this.workers.length;
            worker.initialize((x,y,count,onEmpty)=>this.feeding!.spawnDiscovered(x,y,count,onEmpty,owner),()=>this.playDiscoverySound());
            for(const bush of this.feeding.getOwnedBushes(owner))worker.trackRestored(bush);
            this.workers.push(worker);
        }
        while(this.workers.length>effects.foragers)this.workers.pop()!.retire();
        for(const worker of this.workers)worker.configure({
            speed:WORLD.forager.speed,
            pileSize:WORLD.forager.pileSize+effects.pileSizeBonus,
            discoveryInterval:Math.max(.01,WORLD.forager.discoveryInterval-effects.discoveryIntervalReduction),
            multitasking:WORLD.forager.multitasking+effects.multitaskingBonus,
            extraPileChance:effects.extraPileChance,
            maxCombo:effects.maxCombo,
        });
        for(const worker of this.workers){worker.firstExtraBonus=this.upgrades.upgradeState.genes.monocularity?.3:0;worker.rainbow=!!this.upgrades.upgradeState.level('foragers_RainbowPiles');}
        this.node.getComponent(WorldLayers)!.sortActors();
    }
    public get idleCount():number{
        let count=0;const len=this.workers.length;
        for(let i=0;i<len;i++){const w=this.workers[i];if(w.trackedCount>=w.multitasking)count++;}
        return count;
    }
    public get count():number{return this.workers.length;}
    private playDiscoverySound():void {
        if(!this.discoverySound)return;
        const audio=this.getComponent(AudioSource)||this.addComponent(AudioSource);
        playOriginalSound("bush_discovered",.4);
    }
    onDestroy():void {for(const worker of this.workers)if(isValid(worker.node,true))worker.retire();this.workers=[];}
}
