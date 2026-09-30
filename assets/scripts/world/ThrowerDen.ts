import { playOriginalSound } from "../core/OriginalSound";
import { preferences } from '../core/PlayerMeta';
import { _decorator, Component, Node, Sprite, SpriteFrame, tween, Tween, isValid, EventTouch, AudioSource, AudioClip } from 'cc';
import { gameResources as resources } from '../managers/GameBundles';
import { colonySave, ThrowerSnapshot } from '../core/ColonyPersistence';
import { BlueberryFeeding } from './BlueberryFeeding';
import { WorldLayers } from './WorldLayers';
import { originalFrame } from './OriginalArt';
import { reserveWorldSpawn } from './WorldSpawnQueue';
import { GameScene } from '../scene/GameScene';
import { Thrower } from './Thrower';
import { ColonyPrefabs } from './ColonyPrefabs';
import { playBuildingClickEffect, playBuildingWobble } from './FacilitySupport';
import { BUILDING_POSITIONS } from '../config/MapConfig';
const {ccclass}=_decorator;
@ccclass('ThrowerDen')
export class ThrowerDen extends Component {
    private feeding:BlueberryFeeding|null=null;
    private building:Node|null=null;
    private visual:Node|null=null;
    private frames:SpriteFrame[]=[];
    private loadingFrames=false;
    private workers:Thrower[]=[];
    private saved:ThrowerSnapshot[]=[];
    private restored=false;
    private intro={x:0,y:0};
    private clip:AudioClip|null=null;
    start():void {
        this.feeding=this.getComponent(BlueberryFeeding);const saved=colonySave.load();this.saved=saved?.throwers||[];this.restored=!!saved?.upgrades.levels.evolution_BuildingThrowers;
        this.feeding?.upgrades?.node.on('upgrade-purchased',this.synchronize,this);
        this.synchronize();
    }
    private loadFrames():void {
        if(this.loadingFrames||this.frames.length)return;this.loadingFrames=true;
        resources.load('audio/sfx/InflateArpeggio',AudioClip,(e,c)=>{if(!e&&isValid(this))this.clip=c;});
        Promise.all(['buildings/Den','units/bigcrab','units/bigcrab_eepy','units/LeftArm','units/RightArm','circle'].map(p=>originalFrame('original/'+p)))
            .then(frames=>{if(!isValid(this))return;this.frames=frames;this.synchronize();}).catch(error=>{this.loadingFrames=false;console.error(error);});
    }
    private synchronize():void {
        const state=this.feeding?.upgrades?.upgradeState;if(!state?.level('evolution_BuildingThrowers'))return;
        if(!this.frames.length){this.loadFrames();return;}
        const actors=this.getComponent(WorldLayers)!.actors;
        if(!this.building){
            const b=this.building=this.getComponent(ColonyPrefabs)!.create('ThrowerDen',actors);b.setPosition(...BUILDING_POSITIONS.throwers);
            const v=this.visual=b.getChildByName('Den')!;
            let origin:{x:number;y:number}|null=null;
            v.on(Node.EventType.TOUCH_START,(e:EventTouch)=>origin=e.getUILocation());v.on(Node.EventType.TOUCH_CANCEL,()=>origin=null);
            v.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{const p=e.getUILocation();if(origin&&Math.hypot(p.x-origin.x,p.y-origin.y)<10){e.propagationStopped=true;this.feeding!.upgrades!.openBuildingTab(7);playBuildingClickEffect(v,'squash');}origin=null;});
            if(!this.restored){
                b.setScale(0,0,1);this.node.parent?.getComponent(GameScene)?.focusWorldPoint(b.position,1.5);const apply=()=>b.setScale(this.intro.x,this.intro.y,1);
                tween(this.intro).delay(1.5).call(()=>{if(this.clip)playOriginalSound("InflateArpeggio",.8);}).to(3,{x:1},{easing:'elasticOut',onUpdate:apply}).start();
                tween(this.intro).delay(1.5).to(2,{y:1},{easing:'elasticOut',onUpdate:apply}).start();
            }
        }
        while(this.workers.length<state.level('throwers_SpawnThrower')){
            if(!reserveWorldSpawn(this,()=>this.synchronize()))break;
            const index=this.workers.length,n=this.getComponent(ColonyPrefabs)!.create('Thrower',actors,'Thrower'+index);n.setPosition(...BUILDING_POSITIONS.throwers);
            const worker=n.getComponent(Thrower)!;worker.initialize(this.feeding!,this.frames.slice(1),this.saved[index]);this.workers.push(worker);
            if(!this.restored)this.wobble();
        }
    }
    private wobble():void {if(this.visual)playBuildingWobble(this.visual);}
    public snapshot():ThrowerSnapshot[] {return [...this.workers.map(w=>w.snapshot()),...this.saved.slice(this.workers.length)];}
    onDestroy():void {this.feeding?.upgrades?.node.off('upgrade-purchased',this.synchronize,this);Tween.stopAllByTarget(this.intro);if(this.visual)Tween.stopAllByTarget(this.visual);for(const w of this.workers)if(isValid(w.node,true))w.node.destroy();if(this.building&&isValid(this.building,true))this.building.destroy();}
}
