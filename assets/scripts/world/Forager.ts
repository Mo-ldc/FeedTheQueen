import { unlockAchievement } from '../core/PlayerMeta';
import { _decorator, Component, Node, Vec3, Sprite, SpriteFrame, UITransform, isValid } from 'cc';
import { WORLD } from '../config/WorldConfig';
import { FORAGER_ZONE, FORAGER_ZONE_ORIGIN } from '../config/MapConfig';
import { insidePolygon } from './BlueberryRules';
import { BlueberryBush } from './BlueberryBush';
const { ccclass, property } = _decorator;

const random = (min:number,max:number) => min + Math.random() * (max-min);
const angle = () => Math.random() * Math.PI * 2;
const sample = (keys:number[][],time:number):number[] => {
    for(let i=1;i<keys.length;i++)if(time<=keys[i][0]){
        const left=keys[i-1],right=keys[i];
        const t=(time-left[0])/(right[0]-left[0]);
        return left.slice(1).map((value,j)=>value+(right[j+1]-value)*t);
    }
    return keys[keys.length-1].slice(1);
};

/** Wanders within the original zone and discovers bushes until its tracked slots fill. */
@ccclass('Forager')
export class Forager extends Component {
    @property([SpriteFrame]) runFrames: SpriteFrame[] = [];
    public speed = WORLD.forager.speed;
    public pileSize = WORLD.forager.pileSize;
    public discoveryInterval = WORLD.forager.discoveryInterval;
    public multitasking = WORLD.forager.multitasking;
    public extraPileChance = 0;
    public maxCombo=0;
    public firstExtraBonus=0;
    public rainbow=false;
    private direction = new Vec3(1,0,0);
    private wanderLeft = WORLD.forager.wanderSeconds;
    private discoveryLeft = random(WORLD.forager.firstDiscoveryMin,WORLD.forager.firstDiscoveryMax);
    private tracked = new Set<BlueberryBush>();
    private discoverBush: ((x:number,y:number,count:number,onEmpty:()=>void)=>BlueberryBush|null)|null = null;
    private onDiscovery: (()=>void)|null = null;
    private visual:Node|null = null;
    private head:Node|null = null;
    private tail:Node|null = null;
    private claws:Node|null = null;
    private animationTime = random(0,6);
    private animationElapsed = 0;
    private facingAngle: number | null = null;
    private retiring = false;
    initialize(discover:(x:number,y:number,count:number,onEmpty:()=>void)=>BlueberryBush|null,onDiscovery?:()=>void):void {
        this.discoverBush=discover;
        this.onDiscovery=onDiscovery||null;
        const a=angle();this.direction.set(Math.cos(a),Math.sin(a),0);
        this.visual=this.node.getChildByName('Visuals');
        this.head=this.visual?.getChildByName('Head')||null;
        this.tail=this.visual?.getChildByName('Tail')||null;
        this.claws=this.head?.getChildByName('Claws')||null;
        this.animate(0);
    }
    configure(options:{speed:number;pileSize:number;discoveryInterval:number;multitasking:number;extraPileChance:number;maxCombo?:number}):void {
        this.speed=options.speed;this.pileSize=options.pileSize;
        this.discoveryInterval=options.discoveryInterval;
        this.extraPileChance=options.extraPileChance;
        this.maxCombo=options.maxCombo||0;
        if(options.multitasking>this.multitasking&&this.tracked.size<this.multitasking&&this.discoveryLeft===Infinity)
            this.discoveryLeft=this.discoveryInterval;
        this.multitasking=options.multitasking;
        if(this.tracked.size<this.multitasking&&this.discoveryLeft===Infinity)this.discoveryLeft=this.discoveryInterval;
    }
    update(dt:number):void {
        if((this.node.parent?.parent?.getComponent("WorldContinuity") as Component&{blocks(node:Node):boolean})?.blocks(this.node))return;
        if(this.retiring||!this.discoverBush)return;
        this.animationElapsed += dt;
        if (this.animationElapsed >= 1 / 20) {
            const animationDt = this.animationElapsed;
            this.animationElapsed %= 1 / 20;
            this.animate(animationDt);
        }
        if(this.tracked.size>=this.multitasking)return;
        const p=this.node.position;
        this.node.setPosition(p.x+this.direction.x*this.speed*dt,p.y+this.direction.y*this.speed*dt,0);
        const x=this.node.position.x-FORAGER_ZONE_ORIGIN[0],y=this.node.position.y-FORAGER_ZONE_ORIGIN[1];
        if(!insidePolygon(x,y,FORAGER_ZONE)){
            this.pickDirection(true);this.wanderLeft=WORLD.forager.wanderSeconds;
        }
        this.wanderLeft-=dt;
        if(this.wanderLeft<=0){this.pickDirection(false);this.wanderLeft=WORLD.forager.wanderSeconds;}
        this.discoveryLeft-=dt;
        if(this.discoveryLeft<=0)this.discover();
    }
    private pickDirection(correct:boolean):void {
        const a=angle(),randomX=Math.cos(a),randomY=Math.sin(a);
        if(!correct){this.direction.set(randomX,randomY,0);return;}
        const dx=FORAGER_ZONE_ORIGIN[0]-this.node.position.x,dy=FORAGER_ZONE_ORIGIN[1]-this.node.position.y;
        const length=Math.hypot(dx,dy)||1;
        const rule=WORLD.forager;
        const x=dx/length*rule.correctionTowardCenter+randomX*rule.correctionRandom;
        const y=dy/length*rule.correctionTowardCenter+randomY*rule.correctionRandom;
        const magnitude=Math.hypot(x,y)||1;this.direction.set(x/magnitude,y/magnitude,0);
    }
    private discover():void {
        if(!this.discoverBush)return;
        const offset=WORLD.forager.discoveryOffset;
        let found=false;
        const batch:BlueberryBush[]=[];
        const spawn=()=>{
            const x=this.node.position.x+random(-offset,offset),y=this.node.position.y+random(-offset,offset);
            let bush:BlueberryBush|null=null;
            bush=this.discoverBush!(x,y,this.pileSize,()=>{
                if(bush)this.tracked.delete(bush);
                if(this.tracked.size<this.multitasking&&this.discoveryLeft===Infinity)
                    this.discoveryLeft=this.discoveryInterval;
            });
            if(bush){this.tracked.add(bush);batch.push(bush);found=true;}
        };
        spawn();if(Math.random()<this.extraPileChance+this.firstExtraBonus){spawn();let combos=0;for(let i=0;i<this.maxCombo&&Math.random()<this.extraPileChance;i++){spawn();combos++;}if(combos>=9)unlockAchievement('max_bushes');if(this.rainbow&&combos>=3)batch.forEach(b=>b.rainbow=true);}
        if(found)this.onDiscovery?.();
        this.discoveryLeft=this.tracked.size>=this.multitasking?Infinity:this.discoveryInterval;
    }
    private animate(dt:number):void {
        if(this.runFrames.length&&this.visual&&this.head){
            const moving=this.tracked.size<this.multitasking;
            if(moving)this.animationTime+=dt;
            const frame=this.runFrames[moving?Math.floor(this.animationTime*this.speed*.05*5)%this.runFrames.length:0];
            const sprite=this.head.getComponent(Sprite)!;
            sprite.spriteFrame=frame;sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
            this.head.getComponent(UITransform)!.setContentSize(75*frame.originalSize.width/frame.originalSize.height,75);
            this.visual.setScale(1,.82,1);this.visual.angle=0;this.visual.setPosition(0,0,0);
            this.head.setPosition(0,33,0);this.head.setScale(1,1,1);
            if(this.direction.lengthSqr()>.0001){
                const target=Math.atan2(-this.direction.x,this.direction.y/.82)*180/Math.PI;
                if(this.facingAngle===null)this.facingAngle=target;
                const difference=((target-this.facingAngle+180)%360+360)%360-180;
                const step=720*Math.max(0,dt);
                this.facingAngle+=Math.max(-step,Math.min(step,difference));
                this.facingAngle=((this.facingAngle+180)%360+360)%360-180;
                this.head.angle=this.facingAngle;
            }
            if(this.tail)this.tail.active=false;
            if(this.claws)this.claws.active=false;
            const shadow=this.visual.getChildByName('Shadow');if(shadow)shadow.setPosition(this.head.position);
            const shadow2=this.visual.getChildByName('Shadow2');if(shadow2)shadow2.active=false;
            return;
        }
        this.animationTime+=dt;
        const c=WORLD.forager;
        const t=this.animationTime%c.wobbleSeconds;
        const headScale=sample(c.headScale,t),headRotation=sample(c.headRotation,t);
        const tailScale=sample(c.tailScale,t),clawsPosition=sample(c.clawsPosition,t);
        if(this.visual&&Math.abs(this.direction.x)>.01)
            this.visual.setScale(this.direction.x>0?1:-1,1,1);
        if(this.head){
            this.head.setScale(headScale[0],headScale[1],1);
            this.head.setRotationFromEuler(0,0,-headRotation[0]);
        }
        if(this.tail)this.tail.setScale(tailScale[0],tailScale[1],1);
        if(this.claws)this.claws.setPosition(clawsPosition[0],-clawsPosition[1],0);
    }
    retire():void {
        this.retiring=true;
        for(const bush of this.tracked)if(isValid(bush.node,true))bush.node.destroy();
        this.tracked.clear();this.node.destroy();
    }
    public restorePresentation():void {this.animate(0);}
    public get trackedCount():number{return this.tracked.size;}
    public trackRestored(bush:BlueberryBush):void {
        this.tracked.add(bush);
        bush.node.once('bush-empty',()=>{this.tracked.delete(bush);if(this.tracked.size<this.multitasking&&this.discoveryLeft===Infinity)this.discoveryLeft=this.discoveryInterval;});
    }
    public get timeUntilDiscovery():number{return this.discoveryLeft;}
}
