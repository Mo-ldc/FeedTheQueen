import { playOriginalSound } from "../core/OriginalSound";
import { isValid } from 'cc';
import { playerMeta, unlockAchievement } from '../core/PlayerMeta';
import { WORLD } from '../config/WorldConfig';
import { UI_RULES } from '../config/UIConfig';
import { _decorator, Component, EventTouch, Node, Tween, tween, Vec3, UIOpacity } from 'cc';
import { Food } from '../core/FeedingModel';
const { ccclass } = _decorator;
/** Editable prefab visuals; harvesting is reserved immediately, nutrition on arrival. */
@ccclass('BlueberryBush')
export class BlueberryBush extends Component {
    public foodType=Food.Blueberry;
    public discoveryOwner=-1;
    public remaining = 0;
    public reserved = 0;
    public generation = 0;
    private readyAt = WORLD.blueberry.clickableDelay;
    private age = 0;
    private pointer: number | null = null;
    private startX = 0;
    private startY = 0;
    private moved = false;
    private epoch = 0;
    private getEpoch: () => number = () => 0;
    private onHarvest: (position: Vec3) => void = () => {};
    private onEmpty: () => void = () => {};
    private onRecycled: () => void = () => this.node.destroy();
    private fading = false;
    initialize(amount: number, harvest: (position: Vec3) => void, empty: () => void, epoch: () => number, recycled?: () => void): void {
        this.generation++;
        this.age = 0;
        this.fading = false;
        this.onRecycled = recycled || (() => this.node.destroy());
        this.remaining = amount; this.reserved = 0; this.onHarvest = harvest; this.rainbow=false;this.rainbowClock=0;this.onEmpty = empty; this.getEpoch = epoch;
        const berries = this.node.getChildByPath('Visual/Berries')!.children;
        // Shuffle which original berry positions are used, as in bush.gd.
        const order = berries.map((_,i)=>i);
        for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
        berries.forEach((berry,i)=>berry.active=order.indexOf(i)<amount);
        const visual=this.node.getChildByName('Visual')!;
        const opacity=visual.getComponent(UIOpacity)||visual.addComponent(UIOpacity);
        Tween.stopAllByTarget(opacity);opacity.opacity=255;
        visual.setScale(.01,.01,1);
        tween(visual).to(WORLD.blueberry.appearSeconds,{scale:new Vec3(1,1,1)},{easing:'backOut'}).start();
    }
    onEnable(): void {
        this.node.on(Node.EventType.TOUCH_START,this.begin,this);
        this.node.on(Node.EventType.TOUCH_MOVE,this.move,this);
        this.node.on(Node.EventType.TOUCH_END,this.end,this);
        this.node.on(Node.EventType.TOUCH_CANCEL,this.cancel,this);
    }
    onDisable(): void {
        this.node.off(Node.EventType.TOUCH_START,this.begin,this);
        this.node.off(Node.EventType.TOUCH_MOVE,this.move,this);
        this.node.off(Node.EventType.TOUCH_END,this.end,this);
        this.node.off(Node.EventType.TOUCH_CANCEL,this.cancel,this);
        this.cancel();
    }
    public rainbow=false;private rainbowClock=0;
    update(dt: number): void { this.age += dt;if(this.rainbow){this.rainbowClock+=dt;while(this.rainbowClock>=.05){this.rainbowClock-=.05;if(!this.harvest())break;}} }
    private begin(event: EventTouch): void {
        if(this.pointer!==null||event.getAllTouches().length>1){this.moved=true;return;}
        this.pointer=event.getID(); const point=event.getLocation();
        this.startX=point.x;this.startY=point.y;this.moved=false;this.epoch=this.getEpoch();
        // Intentionally bubble to Canvas: dragging from a bush still pans the map.
    }
    private move(event: EventTouch): void {
        const p=event.getLocation();
        if(event.getAllTouches().length>1||Math.hypot(p.x-this.startX,p.y-this.startY)>UI_RULES.dragTolerance)this.moved=true;
    }
    private end(event: EventTouch): void {
        if(event.getID()!==this.pointer)return;
        this.move(event);
        const harvest=!this.moved&&this.epoch===this.getEpoch();this.cancel();
        if(harvest&&this.harvest()){playOriginalSound('bush_click');playerMeta.manual++;unlockAchievement('humble');if(playerMeta.manual>=100)unlockAchievement('manual');}
    }
    private cancel(): void {this.pointer=null;this.moved=true;}
    public harvest(): boolean {
        if(this.remaining+this.reserved<=0||this.age<this.readyAt)return false;
        if(this.remaining>0)this.remaining--;
        else this.reserved--;
        const visual=this.node.getChildByName('Visual')!;
        const berry=visual.getChildByName('Berries')!.children.find(n=>n.active);
        const position=berry?.worldPosition.clone()||this.node.worldPosition.clone();
        if(berry)berry.active=false;
        this.onHarvest(position);
        Tween.stopAllByTarget(visual);
        visual.setScale(1,1,1);
        if(this.remaining===0 && this.reserved===0){
            this.fadeOut();
        }else{
            tween(visual).to(WORLD.blueberry.harvestInSeconds,{scale:new Vec3(...WORLD.blueberry.harvestSquash,1)}).to(WORLD.blueberry.harvestOutSeconds,{scale:new Vec3(1,1,1)}).start();
        }
        return true;
    }
    /** Godot bush.gd reserves at dispatch, then removes the fruit on pickup. */
    public reserveForHauler(maximum: number): number {
        if (this.remaining <= 0 || this.age < this.readyAt) return 0;
        const amount = Math.min(this.remaining, Math.max(0, Math.floor(maximum)));
        this.remaining -= amount;
        this.reserved += amount;
        return amount;
    }
    public collectReservedForHauler(amount: number): number {
        const collected = Math.min(this.reserved, Math.max(0, Math.floor(amount)));
        const berries = this.node.getChildByPath('Visual/Berries')!.children.filter(n => n.active);
        for (let i = 0; i < collected; i++) if (berries[i]) berries[i].active = false;
        this.reserved -= collected;
        if (this.remaining === 0 && this.reserved === 0) this.fadeOut();
        return collected;
    }
    public releaseReservation(amount: number): void {
        const released = Math.min(this.reserved, Math.max(0, Math.floor(amount)));
        this.reserved -= released;
        this.remaining += released;
    }
    private fadeOut(): void {
        if (this.fading) return;
        this.fading = true;
        this.onEmpty();
        this.node.emit('bush-empty');
        const visual = this.node.getChildByName('Visual')!;
        const opacity = visual.getComponent(UIOpacity) || visual.addComponent(UIOpacity);
        Tween.stopAllByTarget(opacity);
        tween(opacity).to(WORLD.blueberry.fadeSeconds, { opacity: 0 })
            .call(() => this.onRecycled()).start();
    }
    onDestroy(): void {
        const visual=this.node.getChildByName('Visual');
        if(visual&&isValid(visual,true)){Tween.stopAllByTarget(visual);const opacity=visual.getComponent(UIOpacity);if(opacity)Tween.stopAllByTarget(opacity);}
    }
}
