import { _decorator, Component, director, Director, Node, UITransform, UIOpacity, Color, BlockInputEvents, Sprite, Tween, Vec3, isValid } from 'cc';
import { addBlackFadeSprite } from './BlackFadeSprite';
import { BlueberryFeeding } from '../world/BlueberryFeeding';
import { ColonyPrefabs } from '../world/ColonyPrefabs';
import { GameScene } from '../scene/GameScene';
import { PRESENTATION } from '../config/PresentationConfig';
import { originalSample } from '../world/OriginalAnimation';
import { QueenLifecycle } from '../world/QueenLifecycle';
import { ColonyTutorial } from './ColonyTutorial';

const {ccclass}=_decorator;

/** Handles the new-colony departure presentation. The game has no ending cinematic. */
@ccclass('ColonyCinematics')
export class ColonyCinematics extends Component {
    public mode:''|'departure'='';
    public time=0;
    private overlay:Node|null=null;
    private shade:Node|null=null;
    private princess:Node|null=null;
    private finish:(()=>void)|null=null;
    private completed=false;
    private blackFrameAt:number|null=null;
    private queenPose:{node:Node;position:Vec3}[]=[];
    private hidden:Node[]=[];
    private position=new Vec3();
    private scale=new Vec3();

    private get feeding(){return this.getComponent(BlueberryFeeding)!;}
    private get camera(){return this.node.parent!.getComponent(GameScene)!;}

    private begin(done:()=>void):void {
        if(this.mode)return;
        this.mode='departure';this.time=0;this.finish=done;this.completed=false;this.blackFrameAt=null;
        this.position.set(this.node.position);this.scale.set(this.node.scale);
        this.feeding.queen!.getComponent(QueenLifecycle)?.setDeparture(true);
        this.camera.cinematic=true;this.camera.focusWorldPoint(this.feeding.queen!.position,1.5,true);
        this.feeding.upgrades!.close();
        this.getComponent(ColonyTutorial)?.close();

        const ui=this.feeding.upgrades!.node.parent!;
        // Hide the parent: sidebar controllers may toggle their children while
        // the living colony continues to run behind the departure animation.
        this.hidden=ui.active?[ui]:[];ui.active=false;
        const overlay=this.overlay=new Node('Departure');overlay.layer=ui.layer;this.node.parent!.addChild(overlay);
        overlay.addComponent(UITransform).setContentSize(10000,10000);
        overlay.addComponent(BlockInputEvents);
        this.shade=new Node('Fade');this.shade.layer=overlay.layer;overlay.addChild(this.shade);
        this.shade.addComponent(UITransform).setContentSize(10000,10000);
        addBlackFadeSprite(this.shade);
        this.shade.addComponent(UIOpacity).opacity=0;

        this.queenPose=['queen_spr','QueenGround'].map(name=>this.feeding.queen!.getChildByName(name)!)
            .filter(Boolean).map(node=>({node,position:node.position.clone()}));
    }

    public depart(done:()=>void):void {this.begin(done);}

    private animate(root:Node,animation:{duration:number;loop:boolean;tracks:any[]},time:number):void {
        for(const track of animation.tracks){
            const [path,property]=track.path.split(':'),node=path==='.'?root:root.getChildByPath(path);
            if(!node)continue;
            const value=originalSample(track,time,animation.duration,animation.loop);
            if(property==='position')node.setPosition(value[0],-value[1]);
            else if(property==='scale')node.setScale(value[0],value[1],1);
            else if(property==='rotation')node.angle=-value[0]*180/Math.PI;
            else if(property==='modulate'&&node.getComponent(Sprite))
                node.getComponent(Sprite)!.color=new Color(...value.map(x=>x*255));
        }
    }

    update(dt:number):void {
        if(!this.mode||this.completed)return;
        this.time=Math.min(10,this.time+dt);
        const time=this.time;
        // building_queen.__RIzk: seven cubic-in-out pairs, first half starts at 1.
        if(time>=1.5&&time<3.05){
            const step=Math.min(14,(time-1.5)/(1.5/14)),index=Math.floor(step),p=step-index;
            const ease=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
            const y=step>=14?.7:index===0?1:index%2===1?1-.3*ease:.7+.3*ease;
            for(const pose of this.queenPose){pose.node.setScale(1,y,1);pose.node.setPosition(pose.position.x,pose.position.y*y);}
        }
        if(time>=3.05&&!this.princess){
            this.restoreQueenPose();
            this.princess=this.getComponent(ColonyPrefabs)!.create('Princess',this.feeding.queen!.parent!);
            const opacity=this.princess.getComponent(UIOpacity)||this.princess.addComponent(UIOpacity);
            Tween.stopAllByTarget(opacity);
        }
        if(this.princess){
            const age=time-3.05;
            this.princess.setPosition(age*100,-200);
            this.princess.getComponent(UIOpacity)!.opacity=255*Math.min(1,age/2);
            this.animate(this.princess,PRESENTATION.princess.animations.wobble_slow,age);
            if(age>.3)this.node.setPosition(-this.princess.position.x*this.node.scale.x,200*this.node.scale.y);
        }
        this.shade!.getComponent(UIOpacity)!.opacity=255*Math.max(0,Math.min(1,(time-6)/4));
        if(time>=10){
            this.completed=true;
            // Setting opacity in update does not mean a full-black frame has
            // reached the screen. Wait for drawing, then hold before teardown.
            director.on(Director.EVENT_AFTER_DRAW,this.onBlackFrameDrawn,this);
        }
    }

    private onBlackFrameDrawn():void {
        if(!this.mode||!this.completed||!isValid(this.shade,true))return;
        if(this.shade!.getComponent(UIOpacity)!.opacity!==255){this.blackFrameAt=null;return;}
        const now=Date.now();
        if(this.blackFrameAt===null){this.blackFrameAt=now;return;}
        // Measure real time from the first fully black rendered frame. A large
        // update dt or scheduler time scale must not skip the 250 ms hold.
        if(now-this.blackFrameAt<250)return;
        this.cancelPendingFinish();
        const done=this.finish;this.finish=null;
        // Leave the opaque overlay in place while the next scene loads.
        if(done)done();
    }

    private cancelPendingFinish():void {
        director.off(Director.EVENT_AFTER_DRAW,this.onBlackFrameDrawn,this);
        this.blackFrameAt=null;
    }

    private restoreQueenPose():void {
        for(const pose of this.queenPose)if(isValid(pose.node,true)){pose.node.setScale(1,1,1);pose.node.setPosition(pose.position);}
    }

    public end():void {
        this.cancelPendingFinish();
        if(!this.mode)return;
        this.mode='';this.camera.cinematic=false;
        this.node.setPosition(this.position);this.node.setScale(this.scale);
        this.feeding.queen!.getComponent(QueenLifecycle)?.setDeparture(false);
        for(const node of this.hidden)if(isValid(node,true))node.active=true;
        this.hidden=[];
        this.restoreQueenPose();
        this.overlay?.destroy();this.overlay=null;
        this.princess?.destroy();this.princess=null;
        this.finish=null;
    }

    onDestroy():void {
        this.cancelPendingFinish();
        if(this.overlay&&isValid(this.overlay,true))this.overlay.destroy();
        if(this.princess&&isValid(this.princess,true))this.princess.destroy();
    }
}
