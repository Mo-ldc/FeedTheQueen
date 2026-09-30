import { playOriginalSound } from "../core/OriginalSound";
import { WORLD } from '../config/WorldConfig';
import { WorldDepth } from './WorldDepth';
import { _decorator, Component, Node, Prefab, instantiate, isValid, Vec3, tween, Tween } from 'cc';
import { FacilityUpgradePanel } from '../ui/FacilityUpgradePanel';
import { UpgradeResources } from '../ui/UpgradeState';
import { Larva } from './Larva';
import { WorldLayers } from './WorldLayers';
import { reserveWorldSpawn } from './WorldSpawnQueue';
const {ccclass,property}=_decorator;

const MAX_VISUAL_LARVAE = 35;

/** Visual population mirrors the authoritative wallet, never grants resources itself. */
@ccclass('LarvaPopulation')
export class LarvaPopulation extends Component {
    @property(Prefab) larvaPrefab:Prefab|null=null;
    @property(FacilityUpgradePanel) upgrades:FacilityUpgradePanel|null=null;
    @property(Node) queen:Node|null=null;
    @property({min:0}) queenLevel=0;
    private larvae:Node[]=[];
    private pool:Node[]=[];
    private ready=false;
    private renderedLarvae=-1;
    onEnable():void {
        this.upgrades?.node.on('resources-changed',this.synchronize,this);
        this.upgrades?.node.on('upgrade-purchased',this.onPurchased,this);
        if(this.ready&&this.upgrades)this.synchronize(this.upgrades.upgradeState.resources);
    }
    onDisable():void {
        this.upgrades?.node.off('resources-changed',this.synchronize,this);
        this.upgrades?.node.off('upgrade-purchased',this.onPurchased,this);
    }
    start():void {
        if(!this.larvaPrefab||!this.upgrades||!this.queen){console.error('LarvaPopulation: missing prefab/queen/upgrades');return;}
        const layers=this.node.getComponent(WorldLayers)||this.node.addComponent(WorldLayers);
        layers.ensureLayers();this.ready=true;this.synchronize(this.upgrades.upgradeState.resources);
    }
    private synchronize(resources:UpgradeResources):void {
        if(!this.ready||!this.larvaPrefab)return;
        const totalCount=resources.larvae??0;
        const visualTarget=Math.min(totalCount, MAX_VISUAL_LARVAE);
        if(this.renderedLarvae===visualTarget)return;
        this.larvae=this.larvae.filter(n=>isValid(n,true));
        const actors=this.node.getComponent(WorldLayers)!.actors;
        const center=this.queen!.position.clone();
        const inner=WORLD.larva.innerRadius+this.queenLevel*WORLD.larva.radiusPerQueenLevel;
        while(this.larvae.length<visualTarget){
            if(!reserveWorldSpawn(this,()=>this.synchronize(this.upgrades!.upgradeState.resources)))break;
            const n=this.pool.pop()||instantiate(this.larvaPrefab);actors.addChild(n);n.active=true;
            n.getComponent(WorldDepth)!.band=WORLD.render.larvaBand;
            const angle=Math.random()*Math.PI*2,radius=inner*(WORLD.larva.spawnRadiusMin+Math.random()*(WORLD.larva.spawnRadiusMax-WORLD.larva.spawnRadiusMin));
            n.setPosition(center.x+Math.cos(angle)*radius,center.y+Math.sin(angle)*radius,0);
            n.getComponent(Larva)!.initialize(center,inner);this.larvae.push(n);
        }
        while(this.larvae.length>visualTarget){
            const index=Math.floor(Math.random()*this.larvae.length);
            const n=this.larvae.splice(index,1)[0];n.active=false;n.removeFromParent();this.pool.push(n);
        }
        this.renderedLarvae=this.larvae.length===visualTarget?visualTarget:-1;
        this.node.getComponent(WorldLayers)!.sortActors();
    }
    private onPurchased(event:{id:string}):void {
        if(event.id!=='queen_SpawnLarvae')return;playOriginalSound('larvae_spawn');
        const lifecycle=this.queen?.getComponent('QueenLifecycle') as Component&{eat():void};
        if(lifecycle){lifecycle.eat();return;}
        const visual=this.queen?.getChildByName('queen_spr');if(!visual)return;
        Tween.stopAllByTarget(visual);visual.setScale(1,1,1);
        tween(visual).to(WORLD.larva.birthInSeconds,{scale:new Vec3(...WORLD.larva.birthSquash,1)}).to(WORLD.larva.birthOutSeconds,{scale:new Vec3(1,1,1)}).start();
    }
    onDestroy():void {
        for(const n of [...this.larvae,...this.pool])if(isValid(n,true))n.destroy();
        this.larvae=[];this.pool=[];
    }
}
