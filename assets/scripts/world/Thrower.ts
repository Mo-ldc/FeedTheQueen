import { unlockAchievement } from '../core/PlayerMeta';
import { ForagerPopulation } from './ForagerPopulation';
import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Vec3, Color, isValid } from 'cc';
import { Food } from '../core/FeedingModel';
import { ThrowerSnapshot } from '../core/ColonyPersistence';
import { THROWER_ANIMATIONS, ThrowerTrack } from '../config/ThrowerAnimations';
import { BlueberryFeeding } from './BlueberryFeeding';
import { FoodRelay, FoodSource } from './FoodSource';
const {ccclass,property}=_decorator;
type Task='idle'|'seek'|'throw'|'sleep';
@ccclass('Thrower')
export class Thrower extends Component implements FoodRelay {
    @property({type:SpriteFrame,tooltip:'正常状态身体贴图'}) bodyNormalFrame:SpriteFrame|null=null;
    @property({type:SpriteFrame,tooltip:'休息状态身体贴图；暂与正常状态相同，可单独替换'}) bodyRestFrame:SpriteFrame|null=null;
    private feeding!:BlueberryFeeding;
    private frames:SpriteFrame[]=[];
    private task:Task='idle';
    private target:FoodSource|null=null;
    private previous:FoodSource|null=null;
    private generation=0;
    private reserved=0;
    private cargo=0;
    private food=Food.Blueberry;
    private stamina=50;
    private sleepLeft=0;
    private seekLeft=0;
    private throwLeft=0;
    private relayLeft=10;
    private relayReady=false;
    private speedVariation=.98+Math.random()*.04;
    private facing:Node|null=null;
    private body:Sprite|null=null;
    private claws:Node[]=[];
    private fruit:Node[]=[];
    private animation='Idle';
    private animationTime=0;
    private animationElapsed=0;
    private readonly nodeCache=new Map<string,Node|null>();
    private offset=new Vec3();
    public initialize(feeding:BlueberryFeeding,frames:SpriteFrame[],saved?:ThrowerSnapshot):void {
        this.feeding=feeding;this.frames=frames;
        this.facing=this.node.getChildByName('Visuals')!;
        const pivot=this.facing.getChildByPath('visuals2/Sprite2D')!;
        this.body=pivot.getChildByName('Body')!.getComponent(Sprite);
        this.claws=[pivot.getChildByName('LeftClaw')!,pivot.getChildByName('RightClaw')!];
        this.fruit=Array.from({length:5},(_,i)=>pivot.getChildByName(i?'Apple'+(i+1):'Apple')!);
        if(saved){this.node.setPosition(saved.x,saved.y);this.cargo=saved.cargo;this.food=saved.food;this.stamina=saved.stamina;this.sleepLeft=saved.sleep;this.throwLeft=saved.throwLeft;this.relayLeft=saved.relayLeft;this.task=this.cargo?'throw':this.sleepLeft>0?'sleep':this.stamina===0?'throw':'idle';}
        this.feeding.registerRelay(this);this.updateFruit();this.pose();
    }
    private get state(){return this.feeding.upgrades!.upgradeState;}
    private choose(sources:FoodSource[]):FoodSource {
        if(this.previous&&sources.includes(this.previous))return this.previous;
        const mode=this.state.throwerPriority;
        if(mode===1)return sources.reduce((a,b)=>Vec3.squaredDistance(a.node.position,this.node.position)<Vec3.squaredDistance(b.node.position,this.node.position)?a:b);
        if(mode===2)return sources.reduce((a,b)=>a.remaining>b.remaining?a:b);
        if(mode===3)return sources.reduce((a,b)=>a.remaining<b.remaining?a:b);
        return sources[Math.floor(Math.random()*sources.length)];
    }
    private seek():void {
        const sources=this.feeding.getAvailableSources();
        while(sources.length){
            const source=this.choose(sources),reserved=source.reserveForHauler(Math.min(20,this.stamina));
            if(reserved>0){this.target=source;this.generation=source.generation;this.reserved=reserved;this.offset.set(Math.random()*40-20,Math.random()*40-20,0);this.task='seek';return;}
            sources.splice(sources.indexOf(source),1);
        }
        this.seekLeft=1;
    }
    private release():void {
        if(this.target&&isValid(this.target.node,true)&&this.target.generation===this.generation&&this.reserved)this.target.releaseReservation(this.reserved);
        this.target=null;this.reserved=0;
    }
    private converted(food:Food):Food {return food===Food.Apple&&this.state.level('throwers_MidasTouch')&&Math.random()>=(this.state.level('mine_gold')?.94:.97)?Food.GoldenApple:food;}
    update(dt:number):void {
        if((this.node.parent?.parent?.getComponent("WorldContinuity") as Component&{blocks(node:Node):boolean})?.blocks(this.node))return;
        if(!this.feeding||!this.facing)return;
        const effect=this.state.sporeEffects,interval=.4/(1+effect.euphoria+(this.state.genes.up?this.state.activeTunnellers*.2:0)),speed=(70+5*this.state.level('throwers_ThrowerSpeed')+(this.state.genes.entropy&&this.state.throwerPriority===0?70:0)+(this.state.genes.encouragements&&(this.feeding!.node.getComponent(ForagerPopulation)?.idleCount||0)>=3?40:0)+(this.state.genes.high?this.state.level('mushrooms_SpawnMycologist')+this.state.level('mushrooms_SpawnHandler'):0))*(this.state.genes.livewire?2:1)*this.speedVariation;
        if(speed>=300)unlockAchievement('thrower_ms');if(interval<=.16)unlockAchievement('thrower_ts');
        this.relayLeft-=dt;if(this.relayLeft<=0){this.relayLeft+=10;this.relayReady=!!this.state.level('throwers_Springboard');}
        if(this.task==='sleep'){
            this.sleepLeft-=dt;if(this.sleepLeft<=0){this.sleepLeft=0;this.stamina=50;this.previous=null;this.task='idle';}
        }else if(this.task==='idle'){
            this.seekLeft-=dt;if(this.seekLeft<=0)this.seek();
        }else if(this.task==='seek'){
            const target=this.target;
            if(!target||!isValid(target.node,true)||target.generation!==this.generation||target.reserved<=0){this.release();this.previous=null;this.task='idle';}
            else{
                const destination=target.node.position.clone().add(this.offset),delta=destination.subtract(this.node.position),distance=delta.length();
                if(Math.abs(delta.x)>1)this.facing.setScale(delta.x>0?1:-1,1,1);
                if(distance<=100*(1+effect.focus/10)+.5){
                    this.food=target.foodType;this.cargo=target.collectReservedForHauler(this.reserved);this.previous=target;this.reserved=0;this.target=null;
                    this.task=this.cargo?'throw':'idle';this.throwLeft=0;this.updateFruit();
                }else this.node.setPosition(this.node.position.clone().add(delta.normalize().multiplyScalar(Math.min(distance,speed*dt))));
            }
        }else{
            const queen=this.feeding.queen!;if(Math.abs(queen.position.x-this.node.position.x)>1)this.facing.setScale(queen.position.x>this.node.position.x?1:-1,1,1);
            this.throwLeft-=dt;
            // Limit to one throw per frame, retaining elapsed time for catch-up.
            if(this.throwLeft<=0&&this.cargo>0){
                this.play('Throw');this.pose();
                const launch=this.bodyNormalFrame
                    ? this.claws[0].getComponent(UITransform)!.convertToWorldSpaceAR(new Vec3(33.5,-35.5,0))
                    : this.fruit[0].worldPosition.clone();
                this.feeding.deliver(launch,this.converted(this.food),2,250+Math.random()*200);
                this.cargo--;this.stamina--;this.throwLeft+=interval;this.updateFruit();
            }
            if(!this.cargo&&this.throwLeft<=0){
                if(this.stamina<=0){this.task='sleep';this.sleepLeft=Math.max(1,10-this.state.level('throwers_ThrowerCapacity'));}
                else this.task='idle';
            }
        }
        const anim=this.task==='seek'?'wobble':this.task==='throw'?'Throw':this.task==='sleep'?'RESET':'Idle';
        this.play(anim);
        this.animationTime+=dt*(anim==='wobble'?speed*.015:anim==='Throw'?1/interval:1);
        this.animationElapsed+=dt;
        if(this.animationElapsed>=1/20){
            this.animationElapsed%=1/20;
            this.pose();
        }
    }
    private play(name:string):void {if(name!==this.animation){this.animation=name;this.animationTime=0;}}
    private getTrackNode(path:string):Node|null{
        let n=this.nodeCache.get(path);
        if(n===undefined){n=this.node.getChildByPath(path);this.nodeCache.set(path,n);}
        return n;
    }
    private sample(track:ThrowerTrack,time:number):number|number[] {
        const times=track.times,values=track.values;if(times.length===1)return values[0];
        let i=0;while(i<times.length-2&&time>=times[i+1])i++;
        const t=Math.max(0,Math.min(1,(time-times[i])/(times[i+1]-times[i])));
        const calc=(a:number,b:number,p:number,q:number)=>track.interpolation===2?
            .5*((2*a)+(-p+b)*t+(2*p-5*a+4*b-q)*t*t+(-p+3*a-3*b+q)*t*t*t):a+(b-a)*t;
        const a=values[i],b=values[i+1],p=values[Math.max(0,i-1)],q=values[Math.min(values.length-1,i+2)];
        return Array.isArray(a)?a.map((v,j)=>calc(v,(b as number[])[j],(p as number[])[j],(q as number[])[j])):calc(a,b as number,p as number,q as number);
    }
    private pose():void {
        if(!this.body)return;
        const apply=(track:ThrowerTrack,time:number)=>{
            let parsed=(track as any)._parsed;
            if(!parsed){
                const idx=track.path.indexOf(':');
                parsed={path:track.path.substring(0,idx),property:track.path.substring(idx+1)};
                (track as any)._parsed=parsed;
            }
            const n=this.getTrackNode(parsed.path);if(!n)return;const v=this.sample(track,time);
            if(parsed.property==='rotation')n.angle=-(v as number)*180/Math.PI;
            else if(parsed.property==='position')n.setPosition((v as number[])[0],-(v as number[])[1]);
            else if(parsed.property==='scale')n.setScale((v as number[])[0],(v as number[])[1],1);
        };
        for(const t of THROWER_ANIMATIONS.RESET.tracks)apply(t,0);
        const animation=THROWER_ANIMATIONS[this.animation];for(const t of animation.tracks)apply(t,this.animationTime%animation.duration);
        if(this.bodyNormalFrame){
            // The replacement parts share a full canvas. Convert legacy arm
            // offsets into hinge motion instead of separating the layers.
            this.claws.forEach((n,i)=>{
                // Retain the original timing with pivots measured on the new art.
                const legacySwing=n.angle*.65+(n.position.x+1.4285698)*(i===0?-.35:.35);
                // Left hand throws; right hand supports the stock without
                // following the throwing arm's wind-up and release.
                const swing=i===1&&this.cargo>0?35:legacySwing;
                this.hinge(n,i===0?14.5:20.5,i===0?-12.5:-8.5,swing);
            });
            // New 121x93 layers face right and include antennae in the body.
            this.body.node.setScale(1,1,1);
            const holding=this.claws[1],r=holding.angle*Math.PI/180;
            const x=holding.position.x+49.5*Math.cos(r)+27.5*Math.sin(r);
            const y=holding.position.y+49.5*Math.sin(r)-27.5*Math.cos(r);
            this.fruit.forEach((n,i)=>n.setPosition(x,y+10+i*16,0));
        }
        this.body.spriteFrame=this.task==='sleep'?(this.bodyRestFrame||this.bodyNormalFrame||this.frames[1]):(this.bodyNormalFrame||this.frames[0]);
        for(const n of [this.body.node,...this.claws]){
            const sprite=n.getComponent(Sprite)!;sprite.sizeMode=Sprite.SizeMode.RAW;sprite.trim=false;
        }
    }
    private hinge(n:Node,x:number,y:number,degrees:number):void {
        const radians=degrees*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians);
        n.angle=degrees;n.setScale(1,1,1);n.setPosition(x-(c*x-s*y),y-(s*x+c*y));
    }
    public restorePresentation():void {this.pose();}
    private updateFruit():void {this.fruit.forEach((n,i)=>{n.active=i<this.cargo;if(n.active)this.feeding.setFoodSprite(n,this.food);});}
    public claimRelay():boolean {if(!this.relayReady||!this.state.level('throwers_Springboard'))return false;this.relayReady=false;return true;}
    public deliveryPosition():Vec3 {return this.node.getChildByPath('Visuals/visuals2/Sprite2D/FoodDeliveryTarget')!.worldPosition.clone();}
    public receiveRelay(food:Food):void {const converted=this.converted(food);if(converted!==food)unlockAchievement('ballon');this.feeding.deliver(this.deliveryPosition(),converted,1,450+Math.random()*200);}
    public snapshot():ThrowerSnapshot {return {x:this.node.position.x,y:this.node.position.y,cargo:this.cargo,food:this.food,stamina:this.stamina,sleep:this.sleepLeft,throwLeft:Math.max(0,this.throwLeft),relayLeft:Math.max(0,this.relayLeft)};}
    onDestroy():void {this.release();this.feeding?.unregisterRelay(this);}
}
