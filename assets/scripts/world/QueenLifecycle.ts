import { playOriginalSound } from "../core/OriginalSound";
import { preferences } from '../core/PlayerMeta';
import { _decorator, AudioSource, Component, EventTouch, Node, Sprite, SpriteFrame, tween, Tween, UITransform, Vec3, isValid } from 'cc';
import { originalFrame } from './OriginalArt';
import { UI_RULES } from '../config/UIConfig';
import { playBuildingClickEffect, playBuildingWobble } from './FacilitySupport';
const {ccclass}=_decorator;
// building_queen.tscn, Y inverted; target includes the additional 7 * level offset.
const POSES=[[0,22,58,6],[3,54,0,108],[3,73,0,146],[0,81,13,191],
    [0,97,1,233],[0,107,51,256],[0,98,-3,255],[0,97,-3,280]];
@ccclass('QueenLifecycle')
export class QueenLifecycle extends Component {
    private frames:SpriteFrame[]=[];
    private groundFrames:SpriteFrame[]=[];
    private visual:Node|null=null;
    private ground:Node|null=null;
    private audio:AudioSource|null=null;
    private requestedLevel=0;
    private queue:number[]=[];
    private morphing=false;
    private waitingForPose=false;
    private readonly poseLoads=new Map<number,Promise<void>>();
    private eating=false;
    private pendingEat=false;
    private departing=false;
    private progress={x:1,y:1};
    private clickPointer:number|null=null;
    private clickStartX=0;
    private clickStartY=0;
    private clickMoved=false;
    public get isReady():boolean { return !this.morphing&&!this.waitingForPose; }
    onLoad():void {
        this.visual=this.node.getChildByName('queen_spr');
        this.visual?.on(Node.EventType.TOUCH_START,this.onQueenTouchStart,this);
        this.visual?.on(Node.EventType.TOUCH_MOVE,this.onQueenTouchMove,this);
        this.visual?.on(Node.EventType.TOUCH_END,this.onQueenTouchEnd,this);
        this.visual?.on(Node.EventType.TOUCH_CANCEL,this.onQueenTouchCancel,this);
        this.ground=this.node.getChildByName('QueenGround')!;this.ground.active=false;
        this.audio=this.addComponent(AudioSource);
        this.restore(this.requestedLevel);
    }
    public restore(level:number):void {this.requestedLevel=level;this.ensurePose(level).then(()=>{if(isValid(this,true)&&!this.morphing&&this.requestedLevel===level)this.applyPose(level);}).catch(console.error);}
    private ensurePose(level:number):Promise<void> {
        const index=Math.min(7,level);
        if(this.frames[index]&&(index<4||this.groundFrames[index]))return Promise.resolve();
        const pending=this.poseLoads.get(index);if(pending)return pending;
        const requests=[originalFrame('Queen/queen_lvl_'+index)];
        if(index>=4)requests.push(originalFrame('Queen/queen_lvl_'+index+'_2'));
        const load=Promise.all(requests).then(frames=>{
            if(!isValid(this,true))return;
            this.frames[index]=frames[0];if(index>=4)this.groundFrames[index]=frames[1];
        }).catch(error=>{this.poseLoads.delete(index);throw error;});
        this.poseLoads.set(index,load);return load;
    }
    private applyPose(level:number):void {
        if(!this.visual)return;
        const index=Math.min(7,level),pose=POSES[index],frame=this.frames[index];
        if(frame){const sprite=this.visual.getComponent(Sprite)!;sprite.spriteFrame=frame;sprite.sizeMode=Sprite.SizeMode.RAW;this.visual.getComponent(UITransform)!.setContentSize(frame.originalSize);}
        this.visual.setPosition(pose[0],pose[1],0);
        this.node.getChildByName('mouth')?.setPosition(pose[2],pose[3],0);
        if(this.ground){
            const groundFrame=this.groundFrames[index];this.ground.active=!!groundFrame;
            if(groundFrame){
                const sprite=this.ground.getComponent(Sprite)!;
                sprite.spriteFrame=groundFrame;sprite.sizeMode=Sprite.SizeMode.RAW;
                // Godot Sprite2D renders these level-specific ground sheets at
                // their full source dimensions. Keep Cocos' transform in sync
                // as the raw frames grow from level 4 through level 7.
                this.ground.getComponent(UITransform)!.setContentSize(groundFrame.originalSize);
                this.ground.setPosition(0,index===6?88:pose[1],0);
                this.ground.setSiblingIndex(index===4?0:this.node.children.length-1);
            }
        }
    }
    public eat():void {
        if(this.departing||this.morphing||!this.visual)return;
        if(this.eating){
            this.pendingEat=true;
            return;
        }
        this.startEatTween();
    }
    private startEatTween():void {
        if(this.morphing||!this.visual){
            this.eating=false;
            this.pendingEat=false;
            return;
        }
        this.eating=true;
        this.pendingEat=false;
        playBuildingWobble(this.visual);
        tween(this.visual).delay(.5)
            .call(()=>{
                this.eating=false;
                if(this.pendingEat&&!this.morphing&&this.visual&&isValid(this.visual,true)){
                    this.startEatTween();
                }
            }).start();
    }
    public levelUp(level:number):void {this.queue.push(level);if(!this.morphing)this.next();}
    public setDeparture(active:boolean):void {
        this.departing=active;
        if(active){
            this.unscheduleAllCallbacks();
            if(this.morphing)this.queue.unshift(this.requestedLevel);
            this.morphing=false;this.eating=false;this.pendingEat=false;
            Tween.stopAllByTarget(this.progress);
            if(this.visual){Tween.stopAllByTarget(this.visual);this.visual.setScale(1,1,1);}
            if(this.ground){Tween.stopAllByTarget(this.ground);this.ground.setScale(1,1,1);}
        }else this.next();
    }
    private onQueenTouchStart(event:EventTouch):void {
        if(this.clickPointer!==null||event.getAllTouches().length>1){this.clickMoved=true;return;}
        this.clickPointer=event.getID();const point=event.getLocation();this.clickStartX=point.x;this.clickStartY=point.y;this.clickMoved=false;
    }
    private onQueenTouchMove(event:EventTouch):void {
        const point=event.getLocation();if(event.getAllTouches().length>1||Math.hypot(point.x-this.clickStartX,point.y-this.clickStartY)>UI_RULES.dragTolerance)this.clickMoved=true;
    }
    private onQueenTouchEnd(event:EventTouch):void {
        if(event.getID()!==this.clickPointer)return;
        this.onQueenTouchMove(event);const clicked=!this.clickMoved;this.onQueenTouchCancel();
        if(!clicked)return;
        if(this.visual&&!this.morphing)playBuildingClickEffect(this.visual);
        this.node.parent?.parent?.emit('queen-clicked');
    }
    private onQueenTouchCancel():void {this.clickPointer=null;this.clickMoved=true;}
    private next():void {
        const level=this.queue[0];if(this.departing||level===undefined||!this.visual||this.waitingForPose)return;
        this.waitingForPose=true;
        this.ensurePose(level).then(()=>{
            this.waitingForPose=false;
            if(!isValid(this,true)||this.departing||this.queue[0]!==level)return;
            this.queue.shift();this.startMorph(level);
        }).catch(error=>{this.waitingForPose=false;console.error(error);});
    }
    private startMorph(level:number):void {
        if(!this.visual)return;
        this.morphing=true;this.eating=false;this.pendingEat=false;this.requestedLevel=level;
        const world=this.node.parent?.parent;
        const camera=world?.parent?.getComponent('GameScene') as Component&{focusWorldPoint(point:Vec3,seconds:number,force?:boolean,targetZoom?:number):void;cinematic:boolean};
        if(preferences.camera){
            const mouth=this.node.getChildByName('mouth');
            const target=this.node.position.clone().add(mouth?.position||Vec3.ZERO);
            camera?.focusWorldPoint(target,1.5,false,1);
            if(camera){camera.cinematic=true;this.scheduleOnce(()=>{if(isValid(camera,true))camera.cinematic=false;},1);}
        }
        const visual=this.visual;
        Tween.stopAllByTarget(visual);
        tween(visual).delay(1.5).call(()=>this.play('QueenLevelsUp2'))
            .repeat(7,tween().to(1.5/14,{scale:new Vec3(1,1,1)},{easing:'cubicInOut'}).to(1.5/14,{scale:new Vec3(1,.7,1)},{easing:'cubicInOut'}))
            .delay(.05).call(()=>{
                this.applyPose(level);this.play('InflateArpeggio');
                this.progress={x:0,y:0};visual.setScale(0,0,1);
                const apply=()=>{if(isValid(visual,true))visual.setScale(this.progress.x,this.progress.y,1);if(this.ground&&isValid(this.ground,true))this.ground.setScale(this.progress.x,this.progress.y,1);};
                tween(this.progress).to(3,{x:1},{easing:'elasticOut',onUpdate:apply}).start();
                tween(this.progress).to(2,{y:1},{easing:'elasticOut',onUpdate:apply}).start();
            }).delay(3).call(()=>{this.morphing=false;this.eat();this.node.emit('queen-morph-complete',level);this.next();}).start();
    }
    public play(name:string):void {playOriginalSound(name,.8);}
    onDestroy():void {
        this.eating=false;this.pendingEat=false;
        // Child nodes may already be destroyed when the component is torn down.
        // Stop object-targeted morph tweens before touching their event processors.
        Tween.stopAllByTarget(this.progress);
        if(this.visual)Tween.stopAllByTarget(this.visual);
        if(this.visual&&isValid(this.visual,true)){
            this.visual.off(Node.EventType.TOUCH_START,this.onQueenTouchStart,this);
            this.visual.off(Node.EventType.TOUCH_MOVE,this.onQueenTouchMove,this);
            this.visual.off(Node.EventType.TOUCH_END,this.onQueenTouchEnd,this);
            this.visual.off(Node.EventType.TOUCH_CANCEL,this.onQueenTouchCancel,this);
        }
        this.visual=null;this.ground=null;this.queue=[];
    }
}
