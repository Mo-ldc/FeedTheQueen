import { isValid } from 'cc';
import { WORLD } from '../config/WorldConfig';
import { _decorator, Component, Node, Sprite, SpriteFrame, UIOpacity, Vec3, tween, Tween } from 'cc';
const {ccclass,property}=_decorator;
/** Original larva.gd: 5 units/sec, random heading every 3–7 sec, annular wandering. */
@ccclass('Larva')
export class Larva extends Component {
    @property(SpriteFrame) frame1:SpriteFrame|null=null;
    @property(SpriteFrame) frame2:SpriteFrame|null=null;
    private center=new Vec3();
    private innerRadius=WORLD.larva.innerRadius;
    private outerRadius=WORLD.larva.outerRadius;
    private heading=new Vec3(1,0,0);
    private wanderInterval=WORLD.larva.wanderMin+Math.random()*(WORLD.larva.wanderMax-WORLD.larva.wanderMin);
    private remaining=this.wanderInterval;
    private animationTime=0;
    private animationSpeed=WORLD.larva.animationSpeedMin+Math.random()*(WORLD.larva.animationSpeedMax-WORLD.larva.animationSpeedMin);
    private outside=false;
    private lastFrame=-1;
    private visual:Node|null=null;
    private bodySprite:Sprite|null=null;
    private continuity:any=null;
    private continuityChecked=false;

    initialize(center:Vec3,innerRadius:number):void {
        this.remaining=this.wanderInterval;this.animationTime=0;this.outside=false;this.lastFrame=-1;
        this.center.set(center);this.innerRadius=innerRadius;this.pickDirection();
        this.visual=this.node.getChildByName('Visual');
        this.bodySprite=this.visual?.getChildByName('Body')?.getComponent(Sprite)||null;
        const opacity=this.visual?.getComponent(UIOpacity)||this.visual?.addComponent(UIOpacity);
        if(opacity){Tween.stopAllByTarget(opacity);opacity.opacity=0;tween(opacity).to(WORLD.larva.appearSeconds,{opacity:255}).start();}
    }
    private pickDirection(outward=false):void {
        let x=Math.random()*2-1,y=Math.random()*2-1;
        const len=Math.hypot(x,y)||1;x/=len;y/=len;
        if(outward){
            const p=this.node.position,dx=p.x-this.center.x,dy=p.y-this.center.y,d=Math.hypot(dx,dy)||1;
            x=(dx/d+x)*.5;y=(dy/d+y)*.5;
        }
        const length=Math.hypot(x,y);
        this.heading.set(length>.0001?x/length:1,length>.0001?y/length:0,0);
    }
    update(dt:number):void {
        if(!this.continuityChecked){
            this.continuity=this.node.parent?.parent?.getComponent("WorldContinuity")||null;
            this.continuityChecked=true;
        }
        if(this.continuity?.blocks(this.node))return;
        const p=this.node.position;
        this.node.setPosition(p.x+this.heading.x*WORLD.larva.speed*dt,p.y+this.heading.y*WORLD.larva.speed*dt,0);
        const position=this.node.position,dx=position.x-this.center.x,dy=position.y-this.center.y,d=Math.hypot(dx,dy);
        if(d>this.outerRadius){
            if(!this.outside)this.heading.set(-dx/d,-dy/d,0);
            this.outside=true;this.remaining=this.wanderInterval*(WORLD.larva.wanderVariationMin+Math.random()*(WORLD.larva.wanderVariationMax-WORLD.larva.wanderVariationMin));
        }else if(d<this.innerRadius){
            this.pickDirection(true);this.remaining=this.wanderInterval*(WORLD.larva.wanderVariationMin+Math.random()*(WORLD.larva.wanderVariationMax-WORLD.larva.wanderVariationMin));
        }else this.outside=false;
        if(!this.outside){this.remaining-=dt;if(this.remaining<=0){this.pickDirection();this.remaining=this.wanderInterval*(WORLD.larva.wanderVariationMin+Math.random()*(WORLD.larva.wanderVariationMax-WORLD.larva.wanderVariationMin));}}
        if(this.visual&&Math.abs(this.heading.x)>.01)this.visual.setScale(Math.sign(this.heading.x),1,1);
        this.animationTime=(this.animationTime+dt*this.animationSpeed)%(WORLD.larva.frame1Seconds+WORLD.larva.frame2Seconds);
        const frame=this.animationTime<WORLD.larva.frame1Seconds?0:1;
        if(frame!==this.lastFrame){
            this.lastFrame=frame;
            if(this.bodySprite){
                this.bodySprite.spriteFrame=frame===0?this.frame1:this.frame2;
            }
        }
    }
    onDestroy():void {
        const visual=this.visual||this.node.getChildByName('Visual');const opacity=visual&&isValid(visual,true)?visual.getComponent(UIOpacity):null;
        if(opacity)Tween.stopAllByTarget(opacity);
    }
}
