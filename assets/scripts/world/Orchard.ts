import { playOriginalSound } from "../core/OriginalSound";
import { GameScene } from "../scene/GameScene";
import { unlockAchievement } from '../core/PlayerMeta';
import { _decorator, Component, Node, Sprite, UITransform, Vec3, tween, Tween, isValid, EventTouch } from 'cc';
import { Food } from '../core/FeedingModel';
import { colonySave } from '../core/ColonyPersistence';
import { BlueberryFeeding } from './BlueberryFeeding';
import { WorldLayers } from './WorldLayers';
import { FoodSource } from './FoodSource';
import { ColonyPrefabs } from './ColonyPrefabs';
import { playBuildingClickEffect } from './FacilitySupport';
import { buildingReadout } from './BuildingReadout';
import { foodFramePath } from './OriginalArt';
import { BUILDING_POSITIONS } from '../config/MapConfig';
import { reserveWorldSpawn } from './WorldSpawnQueue';
const {ccclass}=_decorator;
const TREE_POSITIONS=[[370,265],[755,265],[1130,265],[370,25],[755,25],[1130,25],[370,-225],[755,-225],[1130,-225],[370,-480],[755,-480],[1130,-480]];
interface Tree {node:Node;fruit:Node[];gatherers:Node[];types:Food[];jump:number;}
type AnimationKey={time:number;value:readonly [number,number];transition?:number};
const NORMAL_POSITION_TRACK:readonly AnimationKey[]=[
    {time:0,value:[0,0]}, {time:.2,value:[0,0],transition:.25},
    {time:.6,value:[0,31],transition:4}, {time:1,value:[0,0]},
];
const STOMP_POSITION_TRACKS:readonly (readonly AnimationKey[])[]=[
    [{time:0,value:[0,0],transition:.25},{time:.6,value:[0,44],transition:4},{time:1,value:[0,0]}],
    [{time:0,value:[0,0],transition:.25},{time:.6,value:[0,54],transition:4},{time:1,value:[0,0]}],
];
const NORMAL_SCALE_TRACK:readonly AnimationKey[]=[
    {time:0,value:[1,1]}, {time:.2,value:[1.1,.9]}, {time:.4,value:[.9,1.1]},
    {time:.6,value:[1,1]}, {time:1,value:[1,1]},
];
const STOMP_SCALE_TRACK:readonly AnimationKey[]=[
    {time:0,value:[1,1]}, {time:.4,value:[.9,1.1]}, {time:.6,value:[1,1]},
    {time:.8,value:[1.1,.9]}, {time:1,value:[1,1]},
];

/** Godot's AnimationPlayer uses this ease curve for per-key transitions. */
function godotEase(t:number,curve:number):number {
    t=Math.max(0,Math.min(1,t));
    if(curve===1)return t;
    if(curve>0)return t<.5?Math.pow(t*2,curve)*.5:(1-Math.pow((1-t)*2,curve))*.5+.5;
    if(curve<0)return t<.5?(1-Math.pow(1-t*2,-curve))*.5:Math.pow((t-.5)*2,-curve)*.5+.5;
    return t<.5?0:1;
}

function sampleTrack(keys:readonly AnimationKey[],time:number,cubic=false):[number,number] {
    let i=0;while(i<keys.length-2&&time>keys[i+1].time)i++;
    const a=keys[i],b=keys[i+1],span=b.time-a.time;
    const t=span?Math.max(0,Math.min(1,(time-a.time)/span)):1;
    if(!cubic){const p=godotEase(t,a.transition??1);return [a.value[0]+(b.value[0]-a.value[0])*p,a.value[1]+(b.value[1]-a.value[1])*p];}
    const prev=keys[Math.max(0,i-1)],next=keys[Math.min(keys.length-1,i+2)];
    const tangent=(left:AnimationKey,mid:AnimationKey,right:AnimationKey,axis:0|1)=>{
        if(left===mid)return (right.value[axis]-mid.value[axis])/(right.time-mid.time);
        if(mid===right)return (mid.value[axis]-left.value[axis])/(mid.time-left.time);
        return (right.value[axis]-left.value[axis])/(right.time-left.time);
    };
    const h00=2*t*t*t-3*t*t+1,h10=t*t*t-2*t*t+t,h01=-2*t*t*t+3*t*t,h11=t*t*t-t*t;
    return [0,1].map(axis=>h00*a.value[axis as 0|1]+h10*span*tangent(prev,a,b,axis as 0|1)+h01*b.value[axis as 0|1]+h11*span*tangent(a,b,next,axis as 0|1)) as [number,number];
}
@ccclass('Orchard')
export class Orchard extends Component {
    private feeding:BlueberryFeeding|null=null;
    private building:Node|null=null;
    private trees:Tree[]=[];
    private amount=0;
    private reserved=0;
    private incoming=0;
    private food=Food.Apple;
    private elapsed=0;
    private ready=false;
    private source:FoodSource|null=null;
    private capacity=100;
    private fruitCount=1;
    private period=15;
    private stomp=false;
    private golden=false;private intro={x:0,y:0};
    start():void {
        this.feeding=this.getComponent(BlueberryFeeding);
        this.feeding?.upgrades?.node.on('upgrade-purchased',this.synchronize,this);
        this.feeding?.upgrades?.node.on('orchard-food-changed',this.changeFood,this);
        const saved=colonySave.load()?.orchard;
        if(saved){this.food=saved.food;this.amount=saved.amount+saved.reserved;this.elapsed=saved.elapsed;}
        // These original frames were never used by Orchard; loading them delayed startup.
        this.ready=true;
        this.synchronize();
    }
    private createBuilding():void {
        const root=this.getComponent(WorldLayers)!.actors;
        const b=this.building=this.getComponent(ColonyPrefabs)!.create('Orchard',root);
        b.setPosition(BUILDING_POSITIONS.orchard[0]+b.position.x,BUILDING_POSITIONS.orchard[1]+b.position.y,b.position.z);
        const bulb=b.getChildByName('Bulb')!;let origin:{x:number;y:number}|null=null;
        b.on(Node.EventType.TRANSFORM_CHANGED,this.layoutTrees,this);
        bulb.on(Node.EventType.TRANSFORM_CHANGED,this.layoutTrees,this);
        bulb.on(Node.EventType.TOUCH_START,(e:EventTouch)=>origin=e.getUILocation());
        bulb.on(Node.EventType.TOUCH_CANCEL,()=>origin=null);
        bulb.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{const p=e.getUILocation();if(origin&&Math.hypot(p.x-origin.x,p.y-origin.y)<10){e.propagationStopped=true;this.feeding!.upgrades!.openBuildingTab(4);playBuildingClickEffect(bulb);}origin=null;});
        const self=this;
        this.source={node:b,generation:1,
            harvestPosition:()=>this.feeding!.offsetMapPoint(b.worldPosition,bulb.position.x+4,bulb.position.y+60),beginHarvest:()=>{this.incoming++;},finishHarvest:()=>{this.incoming--;if(this.amount+this.reserved<this.capacity)this.amount++;},
            get remaining(){return self.amount;},set remaining(v){self.amount=v;},
            get reserved(){return self.reserved;},set reserved(v){self.reserved=v;},
            get foodType(){return self.food;},set foodType(v){self.food=v;},
            reserveForHauler(maximum){const n=Math.min(self.amount,Math.max(0,Math.floor(maximum)));self.amount-=n;self.reserved+=n;return n;},
            collectReservedForHauler(amount){const n=Math.min(self.reserved,Math.max(0,Math.floor(amount)));self.reserved-=n;return n;},
            releaseReservation(amount){const n=Math.min(self.reserved,Math.max(0,Math.floor(amount)));self.reserved-=n;self.amount+=n;},
        };
        this.feeding!.registerSource(this.source);
        if(!colonySave.load()?.orchard){b.setScale(0,0,1);this.node.parent?.getComponent(GameScene)?.focusWorldPoint(b.position,1.5);const apply=()=>b.setScale(this.intro.x,this.intro.y,1);tween(this.intro).delay(1.5).call(()=>playOriginalSound('building_intro')).to(3,{x:1},{easing:'elasticOut',onUpdate:apply}).start();tween(this.intro).delay(1.5).to(2,{y:1},{easing:'elasticOut',onUpdate:apply}).start();}
        root.parent?.getComponent(WorldLayers)?.sortActors();
    }
    private synchronize():void {
        const state=this.feeding?.upgrades?.upgradeState;if(!this.ready||!state?.level('evolution_BuildingOrchard'))return;
        if(!this.building)this.createBuilding();
        const count=state.level('orchard_MoreTrees')+state.level('orchard_MoreTreesExtra');
        this.capacity=100+count*5+state.level('orchard_Plenty')*40;
        this.fruitCount=1+state.level('orchard_Prolificity')+state.level('orchard_Plenty')*2;
        this.period=Math.max(2,15-state.level('orchard_GrowthSpeed'));
        this.stomp=!!state.level('orchard_STOMP');this.golden=!!state.level('orchard_GoldenApples')||!!state.genes.terroir;
        while(this.trees.length<Math.min(12,count)){if(!reserveWorldSpawn(this,()=>this.synchronize()))break;this.createTree(this.trees.length);}
    }
    private createTree(index:number):void {
        const prefabs=this.getComponent(ColonyPrefabs)!;
        const n=prefabs.create('OrchardTree',this.getComponent(WorldLayers)!.actors,'OrchardTree'+index);
        n.setPosition(this.treePosition(index));
        const a=prefabs.create('TreeGatherer',n,'Gatherer'),b=prefabs.create('TreeGatherer',n,'Gatherer2');a.setPosition(140,-14);b.setPosition(-140,-14);b.setScale(-1,1,1);
        a.setSiblingIndex(2);b.setSiblingIndex(3);
        const fruit=Array.from({length:8},(_,i)=>n.getChildByName('Fruit'+i)!);
        const tree={node:n,fruit,gatherers:[a,b],types:[],jump:0};this.trees.push(tree);this.startGrowth(tree);
        this.getComponent(WorldLayers)!.sortActors();
    }
    private treePosition(index:number):Vec3 {
        const building=this.building!,bulb=building.getChildByName('Bulb')!;
        // Bulb's authored default is (-4, 140). Respect both root and artwork moves.
        return new Vec3(building.position.x+bulb.position.x+4+TREE_POSITIONS[index][0],building.position.y+bulb.position.y-140+TREE_POSITIONS[index][1]);
    }
    private layoutTrees():void {
        if(!this.building)return;
        this.trees.forEach((tree,index)=>{if(isValid(tree.node,true))tree.node.setPosition(this.treePosition(index));});
    }
    private startGrowth(tree:Tree):void {
        tree.types=tree.fruit.map(()=>this.food===Food.Apple&&this.golden&&Math.random()<(this.feeding!.upgrades!.upgradeState.genes.terroir?.05:.01)*(this.feeding!.upgrades!.upgradeState.level('mine_gold')?2:1)?Food.GoldenApple:this.food);
        const order=tree.fruit.map((_,i)=>i);for(let i=7;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
        tree.fruit.forEach((n,i)=>{n.active=order.indexOf(i)<this.fruitCount;this.feeding!.setFoodSprite(n,tree.types[i]);n.setScale(0,0,1);});
    }
    private changeFood(food:Food):void {
        if(![Food.Apple,Food.Pepper,Food.Iceberry].includes(food)||food===this.food)return;
        this.food=food;this.amount=0;this.elapsed=0;
        // Release outstanding assignments by generation; old harvest projectiles cannot enter the new store.
        this.reserved=0;if(this.source)this.source.generation++;
        this.incoming=0;for(const tree of this.trees)this.startGrowth(tree);
    }
    update(dt:number):void {
        if(!this.building||!this.feeding)return;
        if((this.getComponent("WorldContinuity") as Component&{blocks(node:Node,scope:string):boolean})?.blocks(this.node,"Orchard"))return;
        this.elapsed+=dt;
        const growthDuration=Math.max(1,this.period-1);
        if(this.elapsed>=this.period){
            this.elapsed%=this.period;
            for(const tree of this.trees){
                tree.fruit.forEach((n,i)=>{
                    if(!n.active||n.scale.x<.5)return;
                    const type=tree.types[i];
                    if(type===Food.GoldenApple)unlockAchievement('golden_tree');
                    if(this.stomp||type===Food.GoldenApple)this.feeding!.launch(n.worldPosition.clone(),type,undefined,undefined,2+Math.random()*.6-.3,600);
                    else if(this.amount+this.reserved+this.incoming<this.capacity){
                        this.feeding!.launchHarvest(n.worldPosition.clone(),type,this.source!,2+Math.random()*.6-.3,600);
                    }
                });
                this.startGrowth(tree);
            }
        }
        const growth=Math.min(1,this.elapsed/growthDuration);
        const hopTime=Math.max(0,Math.min(1,this.elapsed-growthDuration));
        for(const tree of this.trees){
            tree.jump=hopTime;
            this.animateGatherers(tree,hopTime);
            for(const fruit of tree.fruit)if(fruit.active)fruit.setScale(growth,growth,1);
        }
        buildingReadout(this.building,'Capacity',this.stomp?[]:[{value:`${this.amount+this.reserved} / ${this.capacity}`,icon:foodFramePath(this.food)}],0,300);
    }

    private animateGatherers(tree:Tree,time:number):void {
        const t=Math.max(0,Math.min(1,time));
        tree.gatherers.forEach((gatherer,index)=>{
            const position=this.stomp?sampleTrack(STOMP_POSITION_TRACKS[index],t):sampleTrack(NORMAL_POSITION_TRACK,t);
            gatherer.setPosition(gatherer.position.x,-14+position[1],0);
            const visual=gatherer.getChildByName('Visual');
            if(visual){const scale=sampleTrack(this.stomp?STOMP_SCALE_TRACK:NORMAL_SCALE_TRACK,t,this.stomp);visual.setScale(scale[0],scale[1],1);}
        });
    }
    public snapshot(){return {food:this.food,amount:this.amount,reserved:this.reserved,elapsed:this.elapsed};}
    onDestroy():void {Tween.stopAllByTarget(this.intro);
        if(this.building&&isValid(this.building,true)){
            this.building.off(Node.EventType.TRANSFORM_CHANGED,this.layoutTrees,this);
            const bulb=this.building.getChildByName('Bulb');if(bulb&&isValid(bulb,true))bulb.off(Node.EventType.TRANSFORM_CHANGED,this.layoutTrees,this);
        }
        this.feeding?.upgrades?.node.off('upgrade-purchased',this.synchronize,this);
        this.feeding?.upgrades?.node.off('orchard-food-changed',this.changeFood,this);
        if(this.source)this.feeding?.unregisterSource(this.source);
        for(const tree of this.trees){for(const g of tree.gatherers)Tween.stopAllByTarget(g);if(isValid(tree.node,true))tree.node.destroy();}
        if(this.building){Tween.stopAllByTarget(this.building);if(isValid(this.building,true))this.building.destroy();}
    }
}
