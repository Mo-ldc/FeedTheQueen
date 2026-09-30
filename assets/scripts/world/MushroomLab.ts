import { OriginalParticles } from "./OriginalParticles";
import { PRESENTATION } from "../config/PresentationConfig";
import { FACILITY_ANIMATIONS } from "../config/FacilityAnimations";
import { originalSample } from "./OriginalAnimation";
import { playOriginalSound } from "../core/OriginalSound";
import { preferences } from '../core/PlayerMeta';
import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Vec3, Color, UIOpacity, tween, Tween, isValid, EventTouch, AudioSource, AudioClip } from 'cc';
import { gameResources as resources } from '../managers/GameBundles';
import { Food } from '../core/FeedingModel';
import { colonySave } from '../core/ColonyPersistence';
import { MUSHROOM_ZONE } from '../config/MushroomZone';
import { BlueberryFeeding } from './BlueberryFeeding';
import { WorldLayers } from './WorldLayers';
import { FoodSource } from './FoodSource';
import { originalFrame, foodFramePath } from './OriginalArt';
import { reserveWorldSpawn } from './WorldSpawnQueue';
import { buildingReadout } from './BuildingReadout';
import { GameScene } from '../scene/GameScene';
import { ColonyPrefabs } from './ColonyPrefabs';
import { playBuildingClickEffect, playBuildingWobble } from './FacilitySupport';
import { BUILDING_POSITIONS } from '../config/MapConfig';
const {ccclass}=_decorator;
interface Worker {node:Node;visual:Node;held:Node;direction:Vec3;turn:number;pick:number;nap:number;phase:number;heldKind:number;holdLeft:number;}
/** building_mushrooms.gd + mycologist.gd. Spores affect the colony; only excess workers gather food. */
@ccclass('MushroomLab')
export class MushroomLab extends Component {
    private feeding:BlueberryFeeding|null=null;
    private frames:SpriteFrame[]=[];
    private loadingFrames=false;
    private building:Node|null=null;
    private visual:Node|null=null;
    private workers:Worker[]=[];
    private source:FoodSource|null=null;
    private amount=0;
    private reserved=0;
    private incoming=0;
    private capacity=100;
    private elapsed=0;
    private particles=[0,0,0,0];
    private transient=new Set<Node>();
    private restored=false;
    private savedClocks:number[]=[];
    private intro={x:0,y:0};
    private introClip:AudioClip|null=null;
    start():void {
        this.feeding=this.getComponent(BlueberryFeeding);
        const saved=colonySave.load();
        if(saved?.upgrades.levels.evolution_BuildingMushrooms&&saved.mushrooms){const m=saved.mushrooms;this.amount=m.amount+m.reserved;this.elapsed=m.elapsed;this.savedClocks=m.clocks;this.restored=true;}
        this.feeding?.upgrades?.node.on('upgrade-purchased',this.synchronize,this);
        this.synchronize();
    }
    private loadFrames():void {
        if(this.loadingFrames||this.frames.length)return;this.loadingFrames=true;
        resources.load('original/audio/InflateArpeggio',AudioClip,(e,c)=>{if(!e&&isValid(this))this.introClip=c;});
        Promise.all(['buildings/Lab','units/sluggy','units/sluggy_eepy','foods/bolet','foods/amanita','foods/starshroom','foods/clearshroom','foods/chanterelle','circle'].map(p=>originalFrame('original/'+p)))
            .then(frames=>{if(!isValid(this))return;this.frames=frames;this.synchronize();}).catch(error=>{this.loadingFrames=false;console.error(error);});
    }
    private sprite(parent:Node,name:string,frame:SpriteFrame,x=0,y=0):Node {
        const n=new Node(name);n.layer=parent.layer;parent.addChild(n);const s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.RAW;s.spriteFrame=frame;n.setPosition(x,y);return n;
    }
    private actor(name:string,x:number,y:number):Node {
        const n=this.getComponent(ColonyPrefabs)!.create(name==='MushroomLab'?'MushroomLab':'Mycologist',this.getComponent(WorldLayers)!.actors,name);n.setPosition(x,y);return n;
    }
    private create():void {
        const b=this.building=this.actor('MushroomLab',...BUILDING_POSITIONS.mushroomLab);
        this.visual=b.getChildByName('Lab')!;
        let origin:{x:number;y:number}|null=null;
        this.visual.on(Node.EventType.TOUCH_START,(e:EventTouch)=>origin=e.getUILocation());
        this.visual.on(Node.EventType.TOUCH_CANCEL,()=>origin=null);
        this.visual.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{const p=e.getUILocation();if(origin&&Math.hypot(p.x-origin.x,p.y-origin.y)<10){this.feeding!.upgrades!.openBuildingTab(6);playBuildingClickEffect(this.visual!,'mushroom');e.propagationStopped=true;}origin=null;});
        const self=this;
        this.source={node:b,generation:1,foodType:Food.Chanterelle,get remaining(){return self.amount;},set remaining(v){self.amount=v;},get reserved(){return self.reserved;},set reserved(v){self.reserved=v;},
            harvestPosition:()=>this.feeding!.offsetMapPoint(b.worldPosition,0,150),beginHarvest:()=>{this.incoming++;},finishHarvest:()=>{this.incoming--;this.amount++;},
            reserveForHauler(max){const n=Math.min(self.amount,Math.max(0,Math.floor(max)));self.amount-=n;self.reserved+=n;return n;},
            collectReservedForHauler(amount){const n=Math.min(self.reserved,Math.max(0,Math.floor(amount)));self.reserved-=n;return n;},
            releaseReservation(amount){const n=Math.min(self.reserved,Math.max(0,Math.floor(amount)));self.reserved-=n;self.amount+=n;}};
        this.feeding!.registerSource(this.source);
        if(!this.restored){
            b.setScale(0,0,1);this.node.parent?.getComponent(GameScene)?.focusWorldPoint(b.position,1.5);
            const apply=()=>b.setScale(this.intro.x,this.intro.y,1);
            tween(this.intro).delay(1.5).call(()=>{if(this.introClip)playOriginalSound("InflateArpeggio",.8);}).to(3,{x:1},{easing:'elasticOut',onUpdate:apply}).start();
            tween(this.intro).delay(1.5).to(2,{y:1},{easing:'elasticOut',onUpdate:apply}).start();
        }
    }
    private synchronize():void {
        const s=this.feeding?.upgrades?.upgradeState;if(!s?.level('evolution_BuildingMushrooms'))return;
        if(!this.frames.length){this.loadFrames();return;}
        if(!this.building)this.create();
        this.capacity=Math.min(500,100+5*(s.level('mushrooms_SpawnMycologist')+s.level('mushrooms_SpawnHandler')));
        while(this.workers.length<s.level('mushrooms_SpawnMycologist')){
            if(!reserveWorldSpawn(this,()=>this.synchronize()))break;
            const index=this.workers.length,n=this.actor('Mycologist'+index,BUILDING_POSITIONS.mushroomLab[0],BUILDING_POSITIONS.mushroomLab[1]-20);
            const visual=n.getChildByName('Visual')!,held=n.getChildByName('Mushroom')!;held.active=false;
            const a=Math.random()*Math.PI*2;
            this.workers.push({node:n,visual,held,direction:new Vec3(Math.cos(a),Math.sin(a)),turn:5,pick:this.savedClocks[index]||0,nap:0,phase:index*.2,heldKind:-1,holdLeft:0});
            if(!this.restored)this.wobble();
        }
    }
    private wobble():void {
        if(this.visual)playBuildingWobble(this.visual);
    }
    private inside(x:number,y:number):boolean {
        let inside=false;
        for(let i=0,j=MUSHROOM_ZONE.length-1;i<MUSHROOM_ZONE.length;j=i++){
            const a=MUSHROOM_ZONE[i],b=MUSHROOM_ZONE[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
        }
        return inside;
    }
    private pick(worker:Worker,kind:number):void {
        const food=kind===4;
        if(food&&this.amount+this.reserved+this.incoming+this.workers.filter(w=>w.heldKind===4).length>=this.capacity)return;
        worker.heldKind=kind;worker.holdLeft=1;
        worker.held.getComponent(Sprite)!.spriteFrame=this.frames[3+kind];worker.held.active=true;
    }
    private visualFlight(start:Vec3,frame:SpriteFrame):void {
        const projectiles=this.getComponent(WorldLayers)!.projectiles,transform=projectiles.parent!.getComponent(UITransform)!;
        const origin=transform.convertToNodeSpaceAR(start),n=this.sprite(projectiles,'SporeDelivery',frame,origin.x,origin.y);n.setScale(.5,.5,1);this.transient.add(n);
        const end=transform.convertToNodeSpaceAR(this.feeding!.offsetMapPoint(this.building!.worldPosition,0,150)),distance=Vec3.distance(origin,end);
        const duration=1+Math.random()+(distance>600?(distance-500)*.0005:0),height=(300+Math.abs(origin.y-end.y)*.3)*(.94+Math.random()*.12);
        tween(n).to(duration,{position:end},{onUpdate:(_,t)=>n.setPosition(origin.x+(end.x-origin.x)*t,origin.y+(end.y-origin.y)*t+4*height*t*(1-t))}).call(()=>{this.transient.delete(n);n.destroy();}).start();
    }
    private emitSpore(kind:number):void {const spec=PRESENTATION.mushrooms.particles[[0,3,1,2][kind]];OriginalParticles.burst(this.node,this.building!.position.clone().add3f(spec.position[0],-spec.position[1],0),spec,undefined,1);
    }
    update(dt:number):void {
        if((this.getComponent("WorldContinuity") as Component&{blocks(node:Node,scope:string):boolean})?.blocks(this.node,"MushroomLab"))return;
        if(!this.building)return;
        this.elapsed+=dt;const state=this.feeding!.upgrades!.upgradeState,effect=state.sporeEffects,chanterelles=!!state.level('mushrooms_Chanterelles');
        const active=effect.active.map((on,i)=>on?i:-1).filter(i=>i>=0);
        this.workers.forEach((w,i)=>{
            if(w.heldKind>=0){w.held.getComponent(Sprite)!.spriteFrame=this.frames[3+w.heldKind];w.held.active=true;w.holdLeft-=dt;if(w.holdLeft<=0){const kind=w.heldKind;w.heldKind=-1;w.held.active=false;const origin=this.feeding!.offsetMapPoint(w.node.worldPosition,0,100);if(kind===4)this.feeding!.launchHarvest(origin,Food.Chanterelle,this.source!,1+Math.random(),180);else this.visualFlight(origin,this.frames[3+kind]);}}
            const excess=i>=effect.sporeWorkers;
            w.pick+=dt;
            if(w.pick>=6){w.pick%=6;if(!excess&&active.length)this.pick(w,active[Math.floor(Math.random()*active.length)]);else if(excess&&chanterelles)this.pick(w,4);}
            if(w.nap>0){w.nap=Math.max(0,w.nap-dt);w.visual.getComponent(Sprite)!.spriteFrame=this.frames[2];w.visual.angle=0;w.visual.setScale(w.direction.x<0?-1:1,1,1);w.visual.setPosition(0,30);if(w.nap===0){w.phase=0;const a=Math.random()*Math.PI*2;w.direction.set(Math.cos(a),Math.sin(a),0);w.turn=5;}return;}
            w.visual.getComponent(Sprite)!.spriteFrame=this.frames[1];
            w.phase+=dt;
            const pos=w.node.position,next=pos.clone().add(w.direction.clone().multiplyScalar(30*dt));
            w.turn-=dt;
            if(this.inside(next.x,next.y))w.node.setPosition(next);
            else{w.direction=new Vec3(-1630-pos.x,-1170-pos.y).normalize();w.turn=5;}
            if(w.turn<=0){const a=Math.random()*Math.PI*2;w.direction.set(Math.cos(a),Math.sin(a),0);w.turn=5;if(excess&&!chanterelles)w.nap=1+Math.random()*6;}
            const animation=FACILITY_ANIMATIONS.mycologist.wobble;
            for(const track of animation.tracks){const value=originalSample(track,w.phase,animation.duration);const property=track.path.slice(track.path.lastIndexOf(":")+1);if(property==='scale')w.visual.setScale((w.direction.x<0?-1:1)*value[0],value[1],1);else if(property==='position')w.visual.setPosition(value[0],-value[1],0);else if(property==='rotation')w.visual.angle=-value[0]*180/Math.PI;}
        });
        const ratio=Math.min(1,(Math.floor(effect.efficiency*100)%15000)/150);
        for(const kind of active){const spec=PRESENTATION.mushrooms.particles[[0,3,1,2][kind]];this.particles[kind]+=dt*spec.speed*ratio*spec.amount/spec.lifetime;while(this.particles[kind]>=1){this.particles[kind]--;this.emitSpore(kind);}}
        buildingReadout(this.building!,'Capacity',[
            {value:`${Math.round(effect.efficiency*100)}%`,icon:'original/GenePanel/Prestige Icons/Shrooms'},
            ...(chanterelles?[{value:`${this.amount+this.reserved} / ${this.capacity}`,icon:foodFramePath(Food.Chanterelle)}]:[]),
        ],0,275);
    }
    public snapshot(){return {amount:this.amount,reserved:this.reserved,elapsed:this.elapsed,clocks:[...this.workers.map(w=>w.pick),...this.savedClocks.slice(this.workers.length)]};}
    onDestroy():void {
        this.unscheduleAllCallbacks();this.feeding?.upgrades?.node.off('upgrade-purchased',this.synchronize,this);if(this.source)this.feeding?.unregisterSource(this.source);
        Tween.stopAllByTarget(this.intro);if(this.visual)Tween.stopAllByTarget(this.visual);
        for(const n of this.transient){if(!isValid(n,true))continue;Tween.stopAllByTarget(n);const opacity=n.getComponent(UIOpacity);if(opacity)Tween.stopAllByTarget(opacity);if(isValid(n,true))n.destroy();}
        for(const w of this.workers)if(isValid(w.node,true))w.node.destroy();if(this.building&&isValid(this.building,true))this.building.destroy();
    }
}
