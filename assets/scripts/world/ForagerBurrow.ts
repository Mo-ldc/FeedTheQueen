import { playOriginalSound } from "../core/OriginalSound";
import { isValid } from 'cc';
import { preferences } from '../core/PlayerMeta';
import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, Tween, AudioClip, AudioSource, EventTouch } from 'cc';
import { FacilityUpgradePanel } from '../ui/FacilityUpgradePanel';
import { GameScene } from '../scene/GameScene';
import { WorldLayers } from './WorldLayers';
import { WORLD } from '../config/WorldConfig';
import { BUILDING_POSITIONS } from '../config/MapConfig';
import { UI_RULES } from '../config/UIConfig';
import { playBuildingClickEffect } from './FacilitySupport';
const { ccclass, property } = _decorator;

/** Purchased building owns a prefab instance in the same Y-sorted layer as the queen. */
@ccclass('ForagerBurrow')
export class ForagerBurrow extends Component {
    @property(Prefab) prefab: Prefab | null = null;
    @property(FacilityUpgradePanel) upgrades: FacilityUpgradePanel | null = null;
    @property(AudioClip) introSound: AudioClip | null = null;
    private building: Node | null = null;
    private pointer: number | null = null;
    private origin = {x:0,y:0};
    private moved = false;
    private ready = false;
    onEnable(): void { this.upgrades?.node.on('upgrade-purchased', this.purchased, this); }
    onDisable(): void { this.upgrades?.node.off('upgrade-purchased', this.purchased, this); this.pointer=null; }
    start(): void { if(this.upgrades?.upgradeState.level('queen_BuildingForagers')) this.spawn(false); }
    private purchased(event:{id:string}): void {
        if(event.id==='queen_BuildingForagers') this.spawn(true);
    }
    private spawn(animate:boolean): void {
        if(this.building || !this.prefab) return;
        const layers=this.node.getComponent(WorldLayers)!; layers.ensureLayers();
        const building=this.building=instantiate(this.prefab);
        layers.actors.addChild(building);
        building.setPosition(...BUILDING_POSITIONS.foragers,0); layers.sortActors();
        const hit=building.getChildByName('Interact')!;
        hit.on(Node.EventType.TOUCH_START,this.begin,this);
        hit.on(Node.EventType.TOUCH_MOVE,this.move,this);
        hit.on(Node.EventType.TOUCH_CANCEL,this.cancel,this);
        hit.on(Node.EventType.TOUCH_END,this.end,this);
        if(!animate){this.ready=true;return;}
        const config=WORLD.building;
        building.setScale(0,0,1);
        if(config.moveOnBuy) this.node.parent?.getComponent(GameScene)?.focusWorldPoint(building.position,config.introDelay);
        this.scheduleOnce(()=>{
            this.ready=true;
            if(this.introSound){const audio=this.getComponent(AudioSource)||this.addComponent(AudioSource);playOriginalSound("InflateArpeggio",config.introVolume);}
            // Independent axes reproduce Godot's two parallel elastic tweens.
            const progress={x:0,y:0};
            const apply=()=>building.setScale(progress.x,progress.y,1);
            tween(progress).to(config.introXSeconds,{x:1},{easing:'elasticOut',onUpdate:apply}).start();
            tween(progress).to(config.introYSeconds,{y:1},{easing:'elasticOut',onUpdate:apply}).start();
            this.animation=progress;
        },config.introDelay);
    }
    private animation: {x:number,y:number}|null=null;
    private begin(e:EventTouch):void {
        if(this.pointer!==null||e.getAllTouches().length>1){this.moved=true;return;}
        this.pointer=e.getID();this.origin=e.getLocation();this.moved=false;
    }
    private move(e:EventTouch):void {
        const p=e.getLocation();if(e.getAllTouches().length>1||Math.hypot(p.x-this.origin.x,p.y-this.origin.y)>UI_RULES.dragTolerance)this.moved=true;
    }
    private cancel():void {this.pointer=null;this.moved=true;}
    private end(e:EventTouch):void {
        if(e.getID()!==this.pointer)return;
        this.move(e);const clicked=!this.moved&&this.ready;this.cancel();if(!clicked)return;
        this.upgrades?.openBuildingTab(1);
        playBuildingClickEffect(this.building!.getChildByName('Visual')!);
    }
    onDestroy():void {
        this.unscheduleAllCallbacks();if(this.animation)Tween.stopAllByTarget(this.animation);
        if(this.building&&isValid(this.building,true)){const visual=this.building.getChildByName('Visual');if(visual)Tween.stopAllByTarget(visual);if(isValid(this.building,true))this.building.destroy();}
    }
}
