import { unlockAchievement } from '../core/PlayerMeta';
import { _decorator, Component, Node, Sprite, SpriteFrame, UIOpacity, Vec3, easing, isValid } from 'cc';
import { Food } from '../core/FeedingModel';
import { HunterTrapSnapshot } from '../core/ColonyPersistence';
import { BlueberryFeeding } from './BlueberryFeeding';
import { ColonyPrefabs } from './ColonyPrefabs';
import { FoodSource } from './FoodSource';
const {ccclass}=_decorator;

/** Physical trap and prey lifecycle. Nutrition is credited only by the transport destination. */
@ccclass('HunterTrap')
export class HunterTrap extends Component implements FoodSource {
    public remaining=0;
    public reserved=0;
    public generation=1;
    public foodType=Food.Meat;
    public phase:HunterTrapSnapshot['phase']|'carried'|'fading'='carried';
    private age=0;
    private big=false;
    private production=1;
    private rot=30;
    private dropStart=new Vec3();
    private target=new Vec3();
    private initialAngle=0;
    private fadeOpacity=255;
    private arrival=15;
    private preyStart=new Vec3();
    private prey:Node|null=null;
    private feeding!:BlueberryFeeding;
    private prefabs!:ColonyPrefabs;
    private actors!:Node;
    private giantFrame!:SpriteFrame;
    private sound:(name:string)=>void=()=>{};
    private open!:Node;
    private closed!:Node;
    private opacity!:UIOpacity;
    private foods:Node[]=[];
    private particles:{node:Node;vx:number;vy:number;scale:number}[]=[];

    public initialize(feeding:BlueberryFeeding,prefabs:ColonyPrefabs,actors:Node,giantFrame:SpriteFrame,big:boolean,production:number,rot:number,sound:(name:string)=>void,saved?:HunterTrapSnapshot):void {
        this.feeding=feeding;this.prefabs=prefabs;this.actors=actors;this.giantFrame=giantFrame;this.sound=sound;
        this.big=saved?.big??big;this.production=saved?.production??production*(big?15:1);this.rot=saved?.rot??rot;
        this.open=this.node.getChildByPath('TrapVisuals/Open')!;this.closed=this.node.getChildByPath('TrapVisuals/Closed')!;
        this.opacity=this.node.getChildByName('TrapVisuals')!.getComponent(UIOpacity)!;
        this.foods=this.node.getChildByName('FoodVisuals')!.children;
        const scale=this.big?1.5:1;this.open.setScale(scale,scale,1);this.closed.setScale(scale,scale,1);
        if(this.big){this.open.getComponent(Sprite)!.color.set(255,247,226,255);this.closed.getComponent(Sprite)!.color.set(255,247,226,255);}
        this.particles=this.node.getChildByName('Splatter')!.children.map(node=>({node,vx:Math.random()*300-150,vy:100+Math.random()*200,scale:.6+Math.random()*1.4}));
        if(saved){
            this.phase=saved.phase;this.age=saved.age;this.node.setPosition(saved.x,saved.y);this.dropStart.set(saved.startX,saved.startY);this.target.set(saved.targetX,saved.targetY);this.initialAngle=saved.angle;
            this.arrival=saved.arrival;this.preyStart.set(saved.preyX,saved.preyY);this.remaining=saved.amount;this.reserved=0;
            if(this.phase==='waiting')this.spawnPrey(false);
        }
        this.feeding.registerSource(this);this.render();
    }
    public deploy():void {
        this.node.setParent(this.actors,true);this.dropStart.set(this.node.position);this.target.set(this.dropStart.x-20,this.dropStart.y-180,0);
        this.initialAngle=this.node.angle;this.phase='landing';this.age=0;this.node.setScale(1,1,1);
    }
    private spawnPrey(randomize:boolean):void {
        if(randomize){this.arrival=(10+Math.random()*12.5)*(this.big?1.5:1);this.preyStart.set(Math.random()<.5?1000+Math.random()*2650:3650,2100,0);if(this.preyStart.x===3650)this.preyStart.y=550+Math.random()*1550;}
        this.prey=this.prefabs.create('HunterPrey',this.actors);
        if(this.big)this.prey.getChildByPath('Visuals/Head')!.getComponent(Sprite)!.spriteFrame=this.giantFrame;
        this.prey.getChildByName('Visuals')!.setScale(this.node.position.x>=this.preyStart.x?1:-1,1,1);
        this.renderPrey();
    }
    private renderPrey():void {
        if(!this.prey)return;
        const progress=Math.min(1,this.age/this.arrival);
        this.prey.setPosition(this.preyStart.x+(this.node.position.x-this.preyStart.x)*progress,this.preyStart.y+(this.node.position.y-this.preyStart.y)*progress);
        // Original prey.tscn movement keys at 0, .4, .8, 1.2, 1.6 seconds (linear).
        const t=this.age%1.6,k=Math.floor(t/.4),f=t/.4-k;
        const keys=[0,1,0,1,0],wave=keys[k]+(keys[k+1]-keys[k])*f;
        const angles=[0,-5,0,5,0];const head=this.prey.getChildByPath('Visuals/Head')!;
        head.setScale(1+.1*wave,1-.1*wave,1);head.angle=angles[k]+(angles[k+1]-angles[k])*f;head.setPosition(10,30-4*wave);
    }
    public update(dt:number):void {
        if(!this.feeding||this.phase==='carried')return;
        const before=this.age;this.age+=dt;
        if(this.phase==='landing'){
            if(before<2/3&&this.age>=2/3)this.sound('trap_set');
            if(this.age>=8/3){this.age-=8/3;this.node.setPosition(this.target);this.node.angle=0;this.phase='waiting';this.spawnPrey(true);}
        }else if(this.phase==='waiting'){
            if(this.age>=this.arrival){this.age=0;this.phase='caught';this.remaining=this.production;if(this.production>=75)unlockAchievement('max_trap');this.prey?.destroy();this.prey=null;this.sound('trap_trigger');if(this.feeding.upgrades!.upgradeState.genes.scare_tactics)this.feeding.node.emit('trap-caught');}
        }else if(this.phase==='caught'){
            if(this.age>=this.rot)this.expire();
        }else if(this.age>=2){this.node.destroy();return;}
        this.render();
    }
    private render():void {
        if(!this.open)return;
        this.open.active=this.phase==='waiting'||this.phase==='landing'&&this.age>=2/3;this.closed.active=!this.open.active;
        if(this.phase==='landing'){
            const t=easing.bounceOut(Math.min(1,this.age/2));this.node.setPosition(this.dropStart.x+(this.target.x-this.dropStart.x)*t,this.dropStart.y+(this.target.y-this.dropStart.y)*t);
            this.node.angle=this.initialAngle*(1-Math.pow(Math.min(1,this.age),5));
        }
        if(this.phase==='waiting')this.renderPrey();
        const caught=this.phase==='caught',t=Math.min(.8,this.age);
        // trigger: closed trap rises 40px over .4s and returns in .4s; Godot easing .3 then 2.
        const rise=t<.4?1-Math.pow(1-t/.4,1/.3):1-Math.pow((t-.4)/.4,2);
        this.closed.setPosition(0,20+(caught?40*rise:0));
        this.opacity.opacity=caught?255*(1-Math.max(0,Math.min(1,(this.age-1.8)/2))):this.phase==='fading'?this.fadeOpacity*(1-this.age/2):255;
        this.foods.forEach((n,i)=>n.active=caught&&i<this.remaining+this.reserved);
        const particleTime=this.age*3.5;
        for(const p of this.particles){p.node.active=caught&&particleTime<1.5;if(p.node.active){p.node.setPosition(p.vx*particleTime,p.vy*particleTime-125*particleTime*particleTime);const s=p.scale*Math.min(1,(1.5-particleTime)/.75);p.node.setScale(s,s,1);}}
    }
    private expire():void {this.fadeOpacity=this.opacity.opacity;this.remaining=0;this.reserved=0;this.generation++;this.phase='fading';this.age=0;this.feeding.unregisterSource(this);this.render();}
    public reserveForHauler(max:number):number {if(this.phase!=='caught')return 0;const n=Math.min(this.remaining,Math.max(0,Math.floor(max)));this.remaining-=n;this.reserved+=n;return n;}
    public collectReservedForHauler(amount:number):number {if(this.phase!=='caught')return 0;const n=Math.min(this.reserved,Math.max(0,Math.floor(amount)));this.reserved-=n;if(this.remaining+this.reserved===0)this.expire();else this.render();return n;}
    public releaseReservation(amount:number):void {if(this.phase!=='caught')return;const n=Math.min(this.reserved,Math.max(0,Math.floor(amount)));this.reserved-=n;this.remaining+=n;}
    public snapshot():HunterTrapSnapshot|null {
        if(this.phase==='carried'||this.phase==='fading')return null;
        return {phase:this.phase,x:this.node.position.x,y:this.node.position.y,startX:this.dropStart.x,startY:this.dropStart.y,targetX:this.target.x,targetY:this.target.y,angle:this.initialAngle,age:this.age,big:this.big,production:this.production,rot:this.rot,arrival:this.arrival,preyX:this.preyStart.x,preyY:this.preyStart.y,amount:this.remaining+this.reserved};
    }
    onDestroy():void {this.feeding?.unregisterSource(this);if(this.prey&&isValid(this.prey))if(isValid(this.prey,true))this.prey.destroy();}
}
