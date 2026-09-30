import { playOriginalSound } from "../core/OriginalSound";
import { spriteEffect } from "./OriginalSpriteEffects";
import { PRESENTATION } from "../config/PresentationConfig";
import { originalSample } from "./OriginalAnimation";
import { OriginalParticles } from "./OriginalParticles";
import { unlockAchievement } from '../core/PlayerMeta';
import { preferences } from '../core/PlayerMeta';
import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Vec3, tween, Tween, isValid, EventTouch, Color, AudioSource, AudioClip} from 'cc';
import { gameResources as resources } from '../managers/GameBundles';
import { GameScene } from '../scene/GameScene';
import { FOOD_ITEMS } from '../config/ItemConfig';
import { Food } from '../core/FeedingModel';
import { colonySave } from '../core/ColonyPersistence';
import { BlueberryFeeding } from './BlueberryFeeding';
import { WorldLayers } from './WorldLayers';
import { FoodSource } from './FoodSource';
import { originalFrame, foodFramePath } from './OriginalArt';
import { reserveWorldSpawn } from './WorldSpawnQueue';
import { buildingReadout } from './BuildingReadout';
import { ColonyPrefabs } from './ColonyPrefabs';
import { WorldDepth } from './WorldDepth';
import { playBuildingClickSound, playBuildingWobble } from './FacilitySupport';
import { BUILDING_POSITIONS } from '../config/MapConfig';
const {ccclass}=_decorator;
type AphidAnimation='wobble'|'flatten'|'flatHold'|'inflate';
interface Aphid {node:Node;visual:Node;direction:Vec3;turn:number;phase:number;paused:boolean;animation:AphidAnimation;animationTime:number;petTime:number;}
/** building_farm.gd + aphid.gd: physical harvest, storage and hauling. */
@ccclass('AphidFarm')
export class AphidFarm extends Component {
    private feeding:BlueberryFeeding|null=null;
    private frames:SpriteFrame[]=[];
    private loadingFrames=false;
    private building:Node|null=null;
    private bulb:Node|null=null;
    private jumper:Node|null=null;
    private aphids:Aphid[]=[];
    private farmers:Node[]=[];private farmerMotion:{direction:Vec3;turn:number;phase:number}[]=[];
    private food=Food.Honeydew;
    private amount=0;
    private reserved=0;
    private incoming=0;
    private elapsed=0;
    private next=0;
    private startup=0;
    private jumping=false;
    private jumpTime=0;
    private jumpStart=new Vec3();
    private target:Aphid|null=null;
    private previous:Aphid|null=null;
    private source:FoodSource|null=null;
    private restored=false;
    private capacity=100;
    private production=1;
    private double=false;
    private shiny=false;
    private backflip=false;
    private intro={x:0,y:0};
    private wobbling=false;
    private pendingWobble=false;
    private audio:AudioSource|null=null;
    private sounds:Record<string,AudioClip>={};
    private particles:{node:Node;velocity:Vec3;life:number;color:Color}[]=[];
    start():void {
        this.audio=this.addComponent(AudioSource);
        this.feeding=this.getComponent(BlueberryFeeding);
        this.node.on('trap-caught',this.scare,this);
        const snapshot=colonySave.load();
        const saved=snapshot?.upgrades.levels.evolution_BuildingFarm?snapshot.farm:undefined;
        if(saved){this.food=saved.food;this.amount=saved.amount+saved.reserved;this.elapsed=saved.elapsed;this.next=saved.next;this.restored=true;}
        this.feeding?.upgrades?.node.on('upgrade-purchased',this.synchronize,this);
        this.feeding?.upgrades?.node.on('farm-food-changed',this.changeFood,this);
        this.synchronize();
    }
    private loadFrames():void {
        if(this.loadingFrames||this.frames.length)return;this.loadingFrames=true;
        for(const name of ['squish','Pearl2','InflateArpeggio'])resources.load('audio/sfx/'+name,AudioClip,(error,clip)=>{if(!error&&isValid(this))this.sounds[name]=clip;});
        Promise.all(['buildings/Farm','buildings/farm_rocks','units/milkmaid','units/farmer','units/aphid_honey','units/aphid_spicy','units/aphid_meat','dot2'].map(p=>originalFrame('original/'+p)))
            .then(frames=>{if(!isValid(this))return;this.frames=frames;this.synchronize();}).catch(error=>{this.loadingFrames=false;console.error(error);});
    }
    private sprite(parent:Node,name:string,frame:SpriteFrame,x=0,y=0):Node {
        const n=new Node(name);n.layer=parent.layer;parent.addChild(n);const s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.RAW;s.spriteFrame=frame;n.setPosition(x,y);return n;
    }
    private actor(name:string,x:number,y:number):Node {
        const kind=name.startsWith('AphidFarm')?'AphidFarm':name.startsWith('Aphid')?'Aphid':name.startsWith('FarmWorker')?'FarmWorker':'Milkmaid';
        const n=this.getComponent(ColonyPrefabs)!.create(kind,this.getComponent(WorldLayers)!.actors,name);
        if(kind==='Milkmaid')n.addComponent(WorldDepth).band=1;
        n.setPosition(x,y);return n;
    }
    private create():void {
        const b=this.building=this.actor('AphidFarm',...BUILDING_POSITIONS.aphidFarm);
        this.bulb=b.getChildByName('Farm')!;
        this.jumper=this.actor('Milkmaid',BUILDING_POSITIONS.aphidFarm[0]-90,BUILDING_POSITIONS.aphidFarm[1]-20);
        const self=this;
        this.source={node:b,generation:1,get remaining(){return self.amount;},set remaining(v){self.amount=v;},get reserved(){return self.reserved;},set reserved(v){self.reserved=v;},get foodType(){return self.food;},set foodType(v){self.food=v;},
            harvestPosition:()=>this.feeding!.offsetMapPoint(b.worldPosition,68,160),beginHarvest:()=>{this.incoming++;},finishHarvest:()=>{this.incoming--;this.amount++;this.wobbleBuilding();},
            reserveForHauler(max){const n=Math.min(self.amount,Math.max(0,Math.floor(max)));self.amount-=n;self.reserved+=n;return n;},
            collectReservedForHauler(amount){const n=Math.min(self.reserved,Math.max(0,Math.floor(amount)));self.reserved-=n;return n;},
            releaseReservation(amount){const n=Math.min(self.reserved,Math.max(0,Math.floor(amount)));self.reserved-=n;self.amount+=n;}};
        this.feeding!.registerSource(this.source);
        this.bindTap(this.bulb,()=>{this.wobbleBuilding();playBuildingClickSound();this.feeding!.upgrades!.openBuildingTab(5);});
        if(!this.restored){
            b.setScale(0,0,1);this.node.parent?.getComponent(GameScene)?.focusWorldPoint(b.position,1.5);
            const apply=()=>b.setScale(this.intro.x,this.intro.y,1);
            tween(this.intro).delay(1.5).call(()=>this.play('InflateArpeggio',.8)).to(3,{x:1},{easing:'elasticOut',onUpdate:apply}).start();
            tween(this.intro).delay(1.5).to(2,{y:1},{easing:'elasticOut',onUpdate:apply}).start();
        }
        this.startup=this.restored?4:0;
    }
    private bindTap(n:Node,action:()=>void):void {
        let origin:{x:number;y:number}|null=null;
        n.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{origin=e.getUILocation();});
        n.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{const p=e.getUILocation();if(origin&&Math.hypot(p.x-origin.x,p.y-origin.y)<10){e.propagationStopped=true;action();}origin=null;});
        n.on(Node.EventType.TOUCH_CANCEL,()=>origin=null);
    }
    private synchronize():void {
        const state=this.feeding?.upgrades?.upgradeState;if(!state?.level('evolution_BuildingFarm'))return;
        if(!this.frames.length){this.loadFrames();return;}
        if(!this.building)this.create();
        this.production=1+state.level('farm_BugProduction');this.double=!!state.level('farm_DoubleGlaze');this.shiny=!!state.level('farm_Shiny');
        this.capacity=100+state.level('farm_BugProduction')*10+(this.double?60:0)+50*state.level('mine_amber');
        const count=(this.startup>=1.5?2:this.startup>=1?1:0)+state.level('farm_MoreBugs');
        while(this.aphids.length<count){if(!reserveWorldSpawn(this,()=>this.synchronize()))break;this.addAphid();}
        while(this.farmers.length<state.level('farm_BugProduction')){
            if(!reserveWorldSpawn(this,()=>this.synchronize()))break;
            const i=this.farmers.length,a=i*2.4,n=this.actor('FarmWorker'+i,-137+Math.cos(a)*607,-1120+Math.sin(a)*607);
            this.farmers.push(n);this.farmerMotion.push({direction:new Vec3(Math.random()-.5,Math.random()-.5).normalize(),turn:8+Math.random()*4,phase:Math.random()*2});
        }
    }
    private addAphid():void {
        const index=this.aphids.length,angle=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*340;
        const node=this.actor('Aphid'+index,-137+Math.cos(angle)*r,-1140+Math.sin(angle)*r);
        const visual=node.getChildByName('Visual')!;visual.getComponent(Sprite)!.spriteFrame=this.frames[this.food===Food.Honeydew?4:this.food===Food.Sauce?5:6];
        const a={node,visual,direction:new Vec3(Math.cos(angle),Math.sin(angle)),turn:5,phase:Math.random()*1.5,paused:false,animation:'wobble' as AphidAnimation,animationTime:0,petTime:-1};this.aphids.push(a);
        this.bindTap(visual,()=>{if(a.paused)return;a.petTime=0;this.pet(a);});
        if(!this.restored)this.wobbleBuilding();
    }
    private wobbleBuilding():void {
        if(!this.bulb)return;
        if(this.wobbling){
            this.pendingWobble=true;
            return;
        }
        this.startWobbleBuilding();
    }
    private startWobbleBuilding():void {
        if(!this.bulb){
            this.wobbling=false;
            this.pendingWobble=false;
            return;
        }
        this.wobbling=true;
        this.pendingWobble=false;
        playBuildingWobble(this.bulb);
        tween(this.bulb).delay(.5)
            .call(()=>{
                this.wobbling=false;
                if(this.pendingWobble&&this.bulb&&isValid(this.bulb,true)){
                    this.startWobbleBuilding();
                }
            }).start();
    }
    private pet(a:Aphid):void {unlockAchievement('pet');
        this.play('squish',.3);
        this.pluck(a);
    }
    private changeFood(food:Food):void {
        const state=this.feeding?.upgrades?.upgradeState;
        if(food===this.food||!(food===Food.Honeydew||food===Food.Sauce&&state?.level('farm_FireBugs')||food===Food.Meat&&state?.level('farm_MeatBugs')))return;
        this.food=food;this.amount=this.reserved=this.incoming=0;if(this.source)this.source.generation++;
        for(const a of this.aphids)a.visual.getComponent(Sprite)!.spriteFrame=this.frames[food===Food.Honeydew?4:food===Food.Sauce?5:6];
    }
    private flipChain=0;
    private beginJump():void {
        if(!this.aphids.length||this.jumping)return;
        if(this.previous){this.previous.animation='inflate';this.previous.animationTime=0;this.previous.paused=true;}
        this.target=this.aphids[this.next++%this.aphids.length];this.jumpStart=this.jumper!.position.clone();this.jumpTime=0;this.jumping=true;
        this.jumper!.getChildByName('Visual')!.setScale(this.target.node.position.x<this.jumpStart.x?-1:1,1,1);
    }
    private harvest(a:Aphid,scared=false):void {
        this.play('squish',.3);
        this.pluck(a);
        a.paused=true;a.animation='flatten';a.animationTime=0;a.petTime=-1;
        const sign=a.direction.x<0?-1:1;
        const count=Math.max(1,Math.floor((scared?1:this.production)*(this.food===Food.Honeydew?(this.double?2:1)*(this.feeding!.upgrades!.upgradeState.level('mine_amber')?2:1):1)/(this.food===Food.Meat&&!scared?2:1)));
        if(count>=20)unlockAchievement('squish');
        if(!scared&&!this.backflip)this.flipChain=0;
        const food=this.food;
        if(this.backflip&&!scared){for(let i=0;i<count;i++)this.feeding!.deliver(a.node.worldPosition.clone(),food,.8,300);this.flipChain++;if(this.flipChain>=3)unlockAchievement('tricks');this.backflip=false;}else
        // Delayed sprays remain explicit flights, including their remaining delay in saves.
        for(let i=0;i<count&&this.amount+this.reserved+this.incoming<this.capacity;i++){
            this.feeding!.launchHarvest(this.feeding!.offsetMapPoint(a.node.worldPosition,-26*sign,12),food,this.source!, .8,300,i*.05);
        }
        if(this.shiny&&a===this.aphids[0]){if(scared)unlockAchievement('shiny_fear');for(let i=0;i<(this.feeding!.upgrades!.upgradeState.level('mine_nacre')?3:1);i++)this.feeding!.launch(a.node.worldPosition.clone(),Food.Pearl,undefined,undefined,.8,300);this.play('Pearl2',.15);}
    }
    update(dt:number):void {
        if((this.getComponent("WorldContinuity") as Component&{blocks(node:Node,scope:string):boolean})?.blocks(this.node,"AphidFarm"))return;
        if(!this.building)return;
        for(let i=this.particles.length-1;i>=0;i--){
            const p=this.particles[i];p.life+=dt*2;
            if(p.life>=.7){p.node.destroy();this.particles.splice(i,1);continue;}
            p.velocity.y-=800*dt*2;p.node.setPosition(p.node.position.clone().add(p.velocity.clone().multiplyScalar(dt*2)));
            const color=p.color.clone();color.a=255*Math.min(1,(.7-p.life)/(.7*.192));p.node.getComponent(Sprite)!.color=color;
        }
        const old=this.startup;this.startup+=dt;
        if(old<1&&this.startup>=1||old<1.5&&this.startup>=1.5)this.synchronize();
        for(const a of this.aphids){
            a.phase+=dt;
            if(a.animation==='flatten'){
                a.animationTime=Math.min(.1,a.animationTime+dt);
                if(a.animationTime>=.1)a.animation='flatHold';
            }else if(a.animation==='inflate'){
                a.animationTime=Math.min(2.5,a.animationTime+dt);
                if(a.animationTime>=2.5){a.animation='wobble';a.animationTime=0;a.paused=false;a.phase=0;}
            }
            if(a.petTime>=0){a.petTime=Math.min(.6,a.petTime+dt);if(a.petTime>=.6)a.petTime=-1;}
            if(!a.paused&&a.petTime<0){
                a.node.setPosition(a.node.position.clone().add(a.direction.clone().multiplyScalar(50*dt)));a.turn-=dt;
                const offset=a.node.position.clone().subtract(new Vec3(-137,-1140));
                if(offset.length()>340){a.direction=offset.normalize().multiplyScalar(-1);a.turn=5;}
                else if(a.turn<=0){const angle=Math.random()*Math.PI*2;a.direction.set(Math.cos(angle),Math.sin(angle),0);a.turn=4+Math.random()*2;}
            }
            const idle=PRESENTATION.aphid.animations[a.animation==='flatHold'?'flatten':a.animation];
            const idleTime=a.animation==='wobble'?a.phase:a.animation==='flatHold'?.1:a.animationTime;
            for(const track of idle.tracks){
                const value=originalSample(track,idleTime,idle.duration,a.animation==='wobble');
                const property=track.path.slice(track.path.lastIndexOf(':')+1);
                if(property==='scale')a.visual.setScale((a.direction.x<0?-1:1)*value[0],value[1],1);
                else if(property==='rotation')a.visual.angle=-value[0]*180/Math.PI;
                else if(property==='position')a.visual.setPosition(value[0],-value[1],0);
            }
            const pet=PRESENTATION.aphid.animations.pet,petScale=originalSample(pet.tracks[0],a.petTime<0?pet.duration:a.petTime,pet.duration,false);
            const shiny=this.shiny&&a===this.aphids[0];const size=shiny?(this.feeding!.upgrades!.upgradeState.level("mine_nacre")?1.5:1.2):1;a.node.setScale(size*petScale[0],size*petScale[1],1);
            a.visual.getComponent(Sprite)!.color=Color.WHITE;if(shiny)spriteEffect(a.visual.getComponent(Sprite)!,0,1-(a.phase%10)/10,1,1);
        }
        this.farmers.forEach((n,i)=>{const m=this.farmerMotion[i];m.turn-=dt;m.phase+=dt;const offset=n.position.clone().subtract(new Vec3(-137,-1120)),r=offset.length();if(r<507||r>627){m.direction=offset.normalize().multiplyScalar(r>627?-.5:.5).add(new Vec3(Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(.5)).normalize();m.turn=8+Math.random()*4;}else if(m.turn<=0){m.direction.set(Math.random()*2-1,Math.random()*2-1,0).normalize();m.turn=8+Math.random()*4;}n.setPosition(n.position.clone().add(m.direction.clone().multiplyScalar(10*dt)));const v=n.getChildByName("Visual")!;const animation=PRESENTATION.farmer.animations.wobble;if(animation){for(const track of animation.tracks){const value=originalSample(track,m.phase,animation.duration);const property=track.path.slice(track.path.lastIndexOf(":")+1);if(property==='scale')v.setScale((m.direction.x<0?-1:1)*value[0],value[1],1);else if(property==='position')v.setPosition(value[0],-value[1],0);else if(property==='rotation')v.angle=-value[0]*180/Math.PI;}}});
        if(this.startup>=4){this.elapsed+=dt;const period=10/Math.max(1,this.aphids.length);if(this.elapsed>=period&&!this.jumping){this.elapsed%=period;this.beginJump();}}
        if(this.jumping&&this.target){
            if(this.jumpTime===0)this.backflip=!!this.feeding!.upgrades!.upgradeState.genes.backflip&&Math.random()>=.8;
            this.jumpTime+=dt;const t=Math.min(1,this.jumpTime/.8),end=this.target.node.position;
            this.jumper!.setPosition(this.jumpStart.x+(end.x-this.jumpStart.x)*t,this.jumpStart.y+(end.y-this.jumpStart.y)*t+800*t*(1-t));
            this.jumper!.angle=this.backflip?t*360:0;
            if(t===1){this.jumper!.angle=0;this.jumping=false;this.previous=this.target;this.harvest(this.target);}
        }else if(this.previous)this.jumper!.setPosition(this.previous.node.position);
        buildingReadout(this.building!,'Capacity',[{value:`${this.amount+this.reserved} / ${this.capacity}`,icon:foodFramePath(this.food)}],0,250);
    }
    public scare():void {if(this.aphids.length)this.harvest(this.aphids[Math.floor(Math.random()*this.aphids.length)],true);}
    public snapshot(){return {food:this.food,amount:this.amount,reserved:this.reserved,elapsed:this.elapsed,next:this.next};}
    private pluck(a:Aphid):void {
        const color=new Color().fromHEX("#"+FOOD_ITEMS.find(f=>f.id===this.food)!.color);OriginalParticles.burst(this.node,a.node.position.clone().add3f(-25*(a.direction.x<0?-1:1),22,0),PRESENTATION.aphid.particles[0],color);
    }
    private play(name:string,volume:number):void {playOriginalSound(name,volume);}
    onDestroy():void {
        this.wobbling=false;this.pendingWobble=false;
        this.node.off('trap-caught',this.scare,this);
        this.unscheduleAllCallbacks();this.feeding?.upgrades?.node.off('upgrade-purchased',this.synchronize,this);this.feeding?.upgrades?.node.off('farm-food-changed',this.changeFood,this);
        Tween.stopAllByTarget(this.intro);
        if(this.source)this.feeding?.unregisterSource(this.source);
        for(const a of this.aphids){Tween.stopAllByTarget(a.visual);if(isValid(a.node,true))a.node.destroy();}
        for(const p of this.particles)if(isValid(p.node,true))p.node.destroy();
        for(const n of this.farmers)if(isValid(n,true))n.destroy();if(this.bulb)Tween.stopAllByTarget(this.bulb);if(this.building&&isValid(this.building,true))this.building.destroy();if(this.jumper&&isValid(this.jumper,true))this.jumper.destroy();
    }
}
