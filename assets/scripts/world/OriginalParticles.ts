import { _decorator, Component, Node, Vec3, Sprite, SpriteFrame, Color, UITransform, isValid } from 'cc';
import { WorldLayers } from './WorldLayers';
import { originalFrame } from './OriginalArt';
const {ccclass}=_decorator;
export interface ParticleSpec {texture:string;amount:number;lifetime:number;speed:number;explosiveness:number;randomness:number;oneShot:boolean;lifeRandom:number;box:number[];spread:number;direction:number[];velocity:number[];gravity:number[];scale:number[];angle:number[];damping:number[];hue:number[];color:number[];fadeStart:number;alphaCurve?:number[][];scaleCurve?:number[][];sphere?:number;gradient?:number[][];}
interface Particle {node:Node;life:number;duration:number;delay:number;vx:number;vy:number;scale:number;drag:number;color:Color;spec:ParticleSpec;}
export function particleCurve(points:number[][]|undefined,t:number,fallback=1):number {if(!points?.length)return fallback;if(t<=points[0][0])return points[0][1];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(t>b[0])continue;const d=b[0]-a[0],p=(t-a[0])/d;return (2*p*p*p-3*p*p+1)*a[1]+(p*p*p-2*p*p+p)*a[3]*d+(-2*p*p*p+3*p*p)*b[1]+(p*p*p-p*p)*b[2]*d;}return points[points.length-1][1];}
const between=(r:number[])=>r[0]+Math.random()*(r[1]-r[0]);
function hue(c:Color,shift:number):Color {const r=c.r/255,g=c.g/255,b=c.b/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=d===0?0:mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h=((h/6+shift)%1+1)%1;const sat=mx?d/mx:0,k=(n:number)=>{const v=(n+h*6)%6;return mx*(1-sat*Math.max(0,Math.min(v,4-v,1)));};return new Color(k(5)*255,k(3)*255,k(1)*255,c.a);}
/** Replays the source particle material's emission, velocity, gravity, damping and lifetime. */
@ccclass('OriginalParticles')
export class OriginalParticles extends Component {
    private particles:Particle[]=[];private pool:Node[]=[];private frames=new Map<string,SpriteFrame>();
    public static burst(world:Node,position:Vec3,spec:ParticleSpec,color?:Color,count=spec.amount):void {const manager=world.getComponent(OriginalParticles)||world.addComponent(OriginalParticles);manager.emit(position,spec,color,count);}
    public get count():number{return this.particles.length;}
    public emit(position:Vec3,spec:ParticleSpec,color?:Color,count=spec.amount):void {
        const frame=this.frames.get(spec.texture);if(!frame){originalFrame('original/'+spec.texture).then(f=>{if(isValid(this,true)){this.frames.set(spec.texture,f);this.emit(position,spec,color,count);}}).catch(console.error);return;}
        const root=this.getComponent(WorldLayers)!.projectiles;
        for(let i=0;i<count;i++){
            let n=this.pool.pop();if(!n){n=new Node('OriginalParticle');n.layer=this.node.layer;root.addChild(n);n.addComponent(UITransform);n.addComponent(Sprite);}n.active=true;
            const spr=n.getComponent(Sprite)!;spr.spriteFrame=frame;spr.sizeMode=Sprite.SizeMode.RAW;
            n.setPosition(position.x+(Math.random()*2-1)*spec.box[0],position.y+(Math.random()*2-1)*spec.box[1]);if(spec.sphere){const angle=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*spec.sphere;n.setPosition(position.x+Math.cos(angle)*r,position.y+Math.sin(angle)*r);}n.angle=-between(spec.angle);
            const direction=Math.atan2(-spec.direction[1],spec.direction[0])+(Math.random()*2-1)*spec.spread*Math.PI/180,v=between(spec.velocity);
            const base=color?.clone()||new Color(...spec.color.map(v=>v*255)),tint=hue(base,between(spec.hue));spr.color=tint;
            const delay=spec.oneShot?(1-spec.explosiveness)*spec.lifetime*(i/count+Math.random()*spec.randomness/count):spec.lifetime*i/spec.amount;
            const scale=between(spec.scale);n.setScale(scale,scale,1);n.active=delay===0;
            this.particles.push({node:n,life:0,duration:spec.lifetime*(1-Math.random()*spec.lifeRandom),delay,vx:Math.cos(direction)*v,vy:Math.sin(direction)*v,scale,drag:between(spec.damping),color:tint,spec});
        }
    }
    update(dt:number):void {for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i],s=p.spec;let step=dt*s.speed;if(p.delay>0){p.delay-=step;if(p.delay>0)continue;step=-p.delay;p.node.active=true;}p.life+=step;
        if(p.life>=p.duration){p.node.active=false;this.pool.push(p.node);this.particles.splice(i,1);continue;}
        const speed=Math.hypot(p.vx,p.vy),drag=Math.max(0,1-p.drag*step/Math.max(speed,.0001));p.vx=p.vx*drag+s.gravity[0]*step;p.vy=p.vy*drag-s.gravity[1]*step;p.node.setPosition(p.node.position.x+p.vx*step,p.node.position.y+p.vy*step);
        const t=p.life/p.duration;const alpha=particleCurve(s.alphaCurve,t);
        const c=p.color.clone();if(s.gradient?.length){let i=1;while(i<s.gradient.length-1&&t>s.gradient[i][0])i++;const a=s.gradient[i-1],b=s.gradient[i],f=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0])));c.r*=a[1]+(b[1]-a[1])*f;c.g*=a[2]+(b[2]-a[2])*f;c.b*=a[3]+(b[3]-a[3])*f;c.a*=a[4]+(b[4]-a[4])*f;}c.a*=Math.max(0,alpha);p.node.getComponent(Sprite)!.color=c;const scale=p.scale*particleCurve(s.scaleCurve,t);p.node.setScale(scale,scale,1);
    }}
    onDestroy():void {for(const p of this.particles)if(isValid(p.node,true))p.node.destroy();for(const n of this.pool)if(isValid(n,true))n.destroy();}
}
