import { playOriginalSound } from "../core/OriginalSound";
import { unlockAchievement } from '../core/PlayerMeta';
import { preferences } from '../core/PlayerMeta';
import { _decorator, Component, Node, Vec3, SpriteFrame, isValid, EventTouch, Tween, tween } from 'cc';
import { colonySave, HunterTrapSnapshot } from '../core/ColonyPersistence';
import { HUNTER_ZONE } from '../config/HunterZone';
import { HUNTER_ANIMATION } from '../config/HunterAnimation';
import { BlueberryFeeding } from './BlueberryFeeding';
import { ColonyPrefabs } from './ColonyPrefabs';
import { HunterTrap } from './HunterTrap';
import { WorldLayers } from './WorldLayers';
import { GameScene } from '../scene/GameScene';
import { originalFrame, foodFramePath } from './OriginalArt';
import { reserveWorldSpawn } from './WorldSpawnQueue';
import { FoodReceiver } from './FoodSource';
import { Food } from '../core/FeedingModel';
import { playBuildingClickSound, playBuildingWobble } from './FacilitySupport';
import { buildingReadout } from './BuildingReadout';
import { BUILDING_POSITIONS } from '../config/MapConfig';
const {ccclass}=_decorator;
interface Hunter {node:Node;big:boolean;phase:'idle'|'outbound'|'drop'|'return'|'rest';age:number;duration:number;start:Vec3;target:Vec3;dropAt:number;trap:HunterTrap|null;order:number;animation:number;}

@ccclass('HunterCamp')
export class HunterCamp extends Component {
    private feeding!:BlueberryFeeding;
    private prefabs!:ColonyPrefabs;
    private building:Node|null=null;
    private workers:Hunter[]=[];
    private traps:HunterTrap[]=[];
    private saved:HunterTrapSnapshot[]=[];
    private ready=false;
    private loading=false;
    private restored=false;
    private giant!:SpriteFrame;
    private scheduleLeft=1;
    private bait=0;private incoming=0;private receiver:FoodReceiver|null=null;
    private order=0;
    private intro={x:0,y:0};
    private wobbling=false;
    private pendingWobble=false;
    private get actors(){return this.getComponent(WorldLayers)!.actors;}
    private get state(){return this.feeding.upgrades!.upgradeState;}
    public get cooldown(){return 60-5*this.state.level('hunters_HunterCooldown');}
    public get production(){return 1+this.state.level('hunters_CleanCut')+this.state.level('mine_iron')+(this.state.genes.beasthunter&&this.state.level('hunters_SpawnBGH')?1:0);}
    public get rot(){return 30+30*this.state.level('hunters_SaltedEdge');}
    start():void {
        this.feeding=this.getComponent(BlueberryFeeding)!;this.prefabs=this.getComponent(ColonyPrefabs)!;
        const saved=colonySave.load();this.saved=saved?.hunters?.traps||[];this.bait=saved?.hunters?.bait||0;this.restored=!!saved?.upgrades.levels.evolution_BuildingHunters;
        this.feeding.upgrades!.node.on('upgrade-purchased',this.synchronize,this);
        this.synchronize();
    }
    private play=(name:string):void=>{playOriginalSound(name,.7);};
    private synchronize():void {
        if(!this.state.level('evolution_BuildingHunters'))return;
        if(!this.ready){
            if(!this.loading){this.loading=true;originalFrame('original/units/eleph').then(f=>{if(!isValid(this))return;this.giant=f;this.ready=true;this.synchronize();}).catch(error=>{this.loading=false;console.error(error);});}
            return;
        }
        if(!this.building){
            this.building=this.prefabs.create('HunterCamp',this.actors);this.building.setPosition(...BUILDING_POSITIONS.hunterCamp);
            this.receiver={node:this.building,accepts:f=>f===Food.Blueberry&&!!this.state.genes.traps&&this.bait+this.incoming<100,reserveInput:f=>{if(!this.receiver!.accepts(f))return false;this.incoming++;return true;},receiveInput:f=>{this.incoming=Math.max(0,this.incoming-1);this.bait++;this.wobble();return true;},deliveryPosition:()=>this.feeding.offsetMapPoint(this.building!.worldPosition,0,130)};this.feeding.registerReceiver(this.receiver);
            const hit=this.building.getChildByName('Interact')!;let origin:{x:number;y:number}|null=null;
            hit.on(Node.EventType.TOUCH_START,(e:EventTouch)=>origin=e.getUILocation());hit.on(Node.EventType.TOUCH_CANCEL,()=>origin=null);
            hit.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{const p=e.getUILocation();if(origin&&Math.hypot(p.x-origin.x,p.y-origin.y)<10){e.propagationStopped=true;this.feeding.upgrades!.openBuildingTab(8);this.wobble();playBuildingClickSound();}origin=null;});
            for(const s of this.saved)this.makeTrap(s.big,s);
            this.saved=[];
            if(!this.restored){const b=this.building;b.setScale(0,0,1);this.node.parent?.getComponent(GameScene)?.focusWorldPoint(b.position,1.5);const apply=()=>b.setScale(this.intro.x,this.intro.y,1);tween(this.intro).delay(1.5).call(()=>this.play('InflateArpeggio')).to(3,{x:1},{easing:'elasticOut',onUpdate:apply}).start();tween(this.intro).delay(1.5).to(2,{y:1},{easing:'elasticOut',onUpdate:apply}).start();}
        }
        for(const big of [false,true])while(this.workers.filter(w=>w.big===big).length<this.state.level(big?'hunters_SpawnBGH':'hunters_SpawnHunter')){
            if(!reserveWorldSpawn(this,()=>this.synchronize()))break;
            const n=this.prefabs.create('Hunter',this.actors,(big?'GiantHunter':'Hunter')+this.workers.length);n.setPosition(BUILDING_POSITIONS.hunterCamp[0]-100+Math.random()*200,BUILDING_POSITIONS.hunterCamp[1]+240+Math.random()*40);
            this.workers.push({node:n,big,phase:'idle',age:0,duration:0,start:n.position.clone(),target:n.position.clone(),dropAt:0,trap:null,order:this.order++,animation:Math.random()});this.wobble();
        }
        this.scheduleLeft=Math.min(this.scheduleLeft,this.cooldown/Math.max(1,this.workers.length));
    }
    private wobble():void {
        const v=this.building?.getChildByName('Factory');
        if(!v)return;
        if(this.wobbling){
            this.pendingWobble=true;
            return;
        }
        this.startWobble(v);
    }
    private startWobble(v:Node):void {
        this.wobbling=true;
        this.pendingWobble=false;
        playBuildingWobble(v);
        tween(v).delay(.5).call(()=>{
            this.wobbling=false;
            if(this.pendingWobble&&this.building&&isValid(this.building,true)){
                const factory=this.building.getChildByName('Factory');
                if(factory)this.startWobble(factory);
            }
        }).start();
    }
    private target():Vec3 {
        // Rejection sampling inside the original concave TrapZone is uniform by area.
        for(let tries=0;tries<10000;tries++){
            const x=529+Math.random()*(2172-529),y=176+Math.random()*(1274-176);let inside=false;
            for(let i=0,j=HUNTER_ZONE.length-1;i<HUNTER_ZONE.length;j=i++){const a=HUNTER_ZONE[i],b=HUNTER_ZONE[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}
            if(inside)return new Vec3(x,y+225,0);
        }
        return new Vec3(1500,1125,0);
    }
    private makeTrap(big:boolean,saved?:HunterTrapSnapshot,bait=false):HunterTrap {
        const n=this.prefabs.create('HunterTrap',this.actors),t=n.getComponent(HunterTrap)!;
        t.initialize(this.feeding,this.prefabs,this.actors,this.giant,big,this.production+(bait?1:0),this.rot,this.play,saved);this.traps.push(t);return t;
    }
    private dispatch():void {
        const available=this.workers.filter(w=>w.phase==='idle').sort((a,b)=>a.order-b.order),w=available[0];if(!w)return;
        const bait=!!this.state.genes.traps&&this.bait>0;if(bait){this.bait--;unlockAchievement('bait_bug');}
        w.trap=this.makeTrap(w.big,undefined,bait);w.trap.node.setParent(w.node.getChildByPath('Visuals/TrapSocket')!);w.trap.node.setPosition(0,0);w.trap.node.angle=-80*180/Math.PI;
        w.start.set(w.node.position);w.target=this.target();w.duration=(this.cooldown-4)/2+4/3;w.age=0;w.phase='outbound';this.wobble();
    }
    private animate(w:Hunter):void {
        const visual=w.node.getChildByName('Visuals')!,time=w.animation%4;
        const facing=(w.phase==='outbound'||w.phase==='return')&&Math.abs(w.target.x-w.start.x)>.01?(w.target.x>w.start.x?1:-1):Math.sign(visual.scale.x)||1;
        for(const track of HUNTER_ANIMATION){
            let i=0;while(i<track.times.length-2&&time>=track.times[i+1])i++;
            const t=(time-track.times[i])/(track.times[i+1]-track.times[i]);
            const a=track.values[i],b=track.values[i+1],p=track.values[Math.max(0,i-1)],q=track.values[Math.min(track.values.length-1,i+2)];
            const v=a.map((x,j)=>.5*(2*x+(-p[j]+b[j])*t+(2*p[j]-5*x+4*b[j]-q[j])*t*t+(-p[j]+3*x-3*b[j]+q[j])*t*t*t));
            switch(track.property){
                case 'rotation':visual.angle=-v[0]*180/Math.PI;break;
                case 'position':visual.setPosition(v[0],-v[1]);break;
                case 'scale':visual.setScale(facing*v[0],v[1],1);break;
                case 'leftRotation':visual.getChildByName('LeftWing')!.angle=-v[0]*180/Math.PI;break;
                case 'rightRotation':visual.getChildByName('RightWing')!.angle=-v[0]*180/Math.PI;break;
            }
        }
    }
    public update(dt:number):void {
        if((this.getComponent("WorldContinuity") as Component&{blocks(node:Node,scope:string):boolean})?.blocks(this.node,"HunterCamp"))return;
        if(!this.building)return;
        buildingReadout(this.building,'Bait',this.state.genes.traps?[{value:`${this.bait} / 100`,icon:foodFramePath(Food.Blueberry)}]:[],0,370,400,25);
        this.traps=this.traps.filter(t=>isValid(t.node,true));
        this.scheduleLeft-=dt;if(this.scheduleLeft<=0){this.dispatch();this.scheduleLeft+=this.cooldown/Math.max(1,this.workers.length);}
        for(const w of this.workers){
            w.animation+=dt;w.age+=dt;
            this.animate(w);
            if(w.phase==='outbound'||w.phase==='return'){
                const t=Math.min(1,w.age/w.duration);w.node.setPosition(w.start.x+(w.target.x-w.start.x)*t,w.start.y+(w.target.y-w.start.y)*t);
                if(t>=1){w.age=0;if(w.phase==='outbound'){w.phase='drop';w.dropAt=Math.random()*4/3;}else w.phase='rest';}
            }else if(w.phase==='drop'){
                if(w.trap&&w.age>=w.dropAt){w.trap.deploy();w.trap=null;}
                if(w.age>=4/3){w.phase='return';w.age=0;w.start.set(w.node.position);w.target.set(BUILDING_POSITIONS.hunterCamp[0]-100+Math.random()*200,BUILDING_POSITIONS.hunterCamp[1]+200+Math.random()*100,0);w.duration=(this.cooldown-4)/2;}
            }else if(w.phase==='rest'&&w.age>=4/3){w.phase='idle';w.age=0;w.order=this.order++;}
        }
    }
    public snapshot(){return {bait:this.bait+this.incoming,traps:this.building?this.traps.filter(t=>isValid(t.node,true)).map(t=>t.snapshot()).filter((s):s is HunterTrapSnapshot=>!!s):this.saved};}
    onDestroy():void {this.wobbling=false;this.pendingWobble=false;if(this.receiver)this.feeding.unregisterReceiver(this.receiver);this.feeding?.upgrades?.node.off('upgrade-purchased',this.synchronize,this);Tween.stopAllByTarget(this.intro);if(this.building&&isValid(this.building,true)){const v=this.building.getChildByName('Factory');if(v)Tween.stopAllByTarget(v);if(isValid(this.building,true))this.building.destroy();}for(const t of this.traps)if(isValid(t.node,true))t.node.destroy();for(const w of this.workers)if(isValid(w.node,true))w.node.destroy();}
}
