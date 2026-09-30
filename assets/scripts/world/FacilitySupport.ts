import { playOriginalSound } from "../core/OriginalSound";
import { Node, Label, UITransform, Color, Graphics, Button, Vec3, EventTouch, Sprite, tween, Tween } from 'cc';
import { Food } from '../core/FeedingModel';
import { FoodSource } from './FoodSource';
import { FacilityUpgradePanel } from '../ui/FacilityUpgradePanel';
import { createUpgradeChoice, styleUpgradeChoice } from '../ui/UpgradeChoiceSkin';
import { useDefaultSystemFont } from '../ui/DefaultSystemFont';
import { originalSample } from './OriginalAnimation';
import type { OriginalTrack } from './OriginalAnimation';
export class FoodBin implements FoodSource {
    public remaining=0;public reserved=0;public generation=0;
    constructor(public node:Node,public foodType:Food){}
    public reserveForHauler(maximum:number):number {const n=Math.min(this.remaining,maximum);this.remaining-=n;this.reserved+=n;return n;}
    public collectReservedForHauler(amount:number):number {const n=Math.min(this.reserved,amount);this.reserved-=n;return n;}
    public releaseReservation(amount:number):void {this.remaining+=this.collectReservedForHauler(amount);}
    public reset():void {this.generation++;this.remaining=0;this.reserved=0;}
    public get total(){return this.remaining+this.reserved;}
}
export function caption(parent:Node,name:string,text:string,x:number,y:number,width=650,size=23):Label {
    let n=parent.getChildByName(name);if(!n){n=new Node(name);n.layer=parent.layer;parent.addChild(n);n.addComponent(UITransform);n.addComponent(Label);}
    n.setPosition(x,y);n.getComponent(UITransform)!.setContentSize(width,50);
    const l=n.getComponent(Label)!;useDefaultSystemFont(l);l.string=text;l.fontSize=size;l.lineHeight=size+4;l.color=new Color(255,240,209);l.enableOutline=true;l.outlineColor=new Color(25,15,10,255);l.outlineWidth=2;l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;return l;
}
export function choice(parent:Node,name:string,text:string,x:number,y:number,width:number,action:()=>void):Node {
    const n=createUpgradeChoice(parent,name,text,action);
    const textNode=n.getChildByName('Label')||n.getChildByName('Caption');
    if(textNode)textNode.name='Caption';
    n.setPosition(x,y);n.getComponent(UITransform)!.setContentSize(width,50);
    styleUpgradeChoice(n,false);
    caption(n,'Caption',text,0,0,width-12,23);
    return n;
}
export function markChoice(n:Node,on:boolean,enabled=true):void {
    n.getComponent(Button)!.interactable=enabled;
    styleUpgradeChoice(n,on,enabled);
}
const buildingClickScales=new WeakMap<Node,Vec3>();
const buildingClickProgress=new WeakMap<Node,{time:number}>();
type ClickAnimation='standard'|'squash'|'farm'|'mushroom';
export function playBuildingClickSound():void {playOriginalSound('ui_option_toggle');}
export function playScaleTrack(visual:Node,track:OriginalTrack,duration:number):void {
    let base=buildingClickScales.get(visual);
    if(!base){base=visual.scale.clone();buildingClickScales.set(visual,base);}
    Tween.stopAllByTarget(visual);
    const previous=buildingClickProgress.get(visual);if(previous)Tween.stopAllByTarget(previous);
    visual.setScale(base);
    const progress={time:0};
    buildingClickProgress.set(visual,progress);
    const stopOnDestroy=()=>Tween.stopAllByTarget(progress);
    visual.once(Node.EventType.NODE_DESTROYED,stopOnDestroy);
    tween(progress).to(duration,{time:duration},{onUpdate:()=>{if(!visual.isValid)return;const scale=originalSample(track,progress.time,duration,false);visual.setScale(base!.x*scale[0],base!.y*scale[1],base!.z);}}).call(()=>{buildingClickProgress.delete(visual);visual.off(Node.EventType.NODE_DESTROYED,stopOnDestroy);if(visual.isValid)visual.setScale(base!);}).start();
}
const BUILDING_WOOB_TRACK:OriginalTrack={times:[0,.2,.4],transitions:[.5,-2,1],values:[[1,1],[1,.8],[1,1]],interpolation:1};
export function playBuildingWobble(visual:Node):void { playScaleTrack(visual,BUILDING_WOOB_TRACK,.5); }
export function playBuildingClickEffect(visual:Node,_animation:ClickAnimation='standard'):void {
    playBuildingWobble(visual);
    playBuildingClickSound();
}
function clickVisual(building:Node):Node {
    const path:Record<string,string>={EastHaulerApartment:'Building',Mine:'Building',TunnellerDen:'Building',FishingDock:'Stall',Kitchen:'Cauldron'};
    const target=path[building.name]?building.getChildByPath(path[building.name]):null;
    const sprite=target?.getComponent(Sprite)?target:target?.getComponentsInChildren(Sprite)[0]?.node||building.getComponentsInChildren(Sprite)[0]?.node;
    return sprite||building;
}
export function bindFacility(n:Node,panel:FacilityUpgradePanel,page:number,animate:boolean,onClickEffect?:()=>void):void {
    const hit=n.getChildByName('Interact')!;let start:Vec3|null=null;
    hit.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{const p=e.getUILocation();start=new Vec3(p.x,p.y);});
    hit.on(Node.EventType.TOUCH_CANCEL,()=>start=null);
    hit.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{const p=e.getUILocation();if(start&&Math.hypot(p.x-start.x,p.y-start.y)<10){e.propagationStopped=true;if(panel.openBuildingTab(page)){if(onClickEffect){onClickEffect();playBuildingClickSound();}else playBuildingClickEffect(clickVisual(n),n.name==='ThrowerDen'?'squash':'standard');}}start=null;});
    if(animate){const state={x:0,y:0};n.setScale(0,0,1);const apply=()=>n.setScale(state.x,state.y,1);tween(state).delay(1.5).call(()=>playOriginalSound('InflateArpeggio',.8)).to(3,{x:1},{easing:'elasticOut',onUpdate:apply}).start();tween(state).delay(1.5).to(2,{y:1},{easing:'elasticOut',onUpdate:apply}).start();n.once(Node.EventType.NODE_DESTROYED,()=>Tween.stopAllByTarget(state));}
}
export function disposeFacility(n:Node|null):void {if(n&&n.isValid){Tween.stopAllByTarget(n);n.destroy();}}
