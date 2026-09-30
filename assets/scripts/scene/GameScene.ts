import '../core/RenderingSetup';
import { addBlackFadeSprite } from '../ui/BlackFadeSprite';
import { preferences } from '../core/PlayerMeta';
import { WORLD } from '../config/WorldConfig';
import { ColonySession } from '../core/ColonySession';
import {
    _decorator,
    Component, input, Input, EventKeyboard, KeyCode,
    EventMouse,
    EventTouch,
    Touch,
    BlockInputEvents,
    Node,
    tween,
    Tween,
    UITransform,
    UIOpacity,
    Vec3,
    isValid,
} from 'cc';
import { consumeGameFadeIn } from './SceneTransition';

const { ccclass, property } = _decorator;

/**
 * Pans the playable world beneath the fixed UI canvas.
 *
 * Keep every object with world coordinates (map, queen, food, facilities and
 * workers) under `WorldRoot`. HUD nodes must remain outside it, so buttons and
 * resource bars do not move when the player explores the map.
 */
@ccclass('GameScene')
export class GameScene extends Component {
    @property({ type: Node, tooltip: 'Container for all world-space content.' })
    public worldRoot: Node | null = null;

    @property({ displayName: '最小缩放', min: 0.01, step: 0.01, tooltip: '越小看得越远。实际下限会自动保证地图铺满屏幕，填写过小也不会露出地图外的空白。' })
    public minZoom: number = WORLD.map.minZoom;

    @property({ displayName: '最大缩放', min: 0.01, step: 0.01, tooltip: '越大看得越近。实际值不会低于最小缩放和地图安全下限。' })
    public maxZoom: number = WORLD.map.maxZoom;

    @property({ displayName: '按钮缩放步长', min: 0.01, step: 0.01 })
    public zoomStep: number = WORLD.map.zoomStep;

    @property({ displayName: '按钮缩放时间', min: 0, tooltip: '只控制按钮与滚轮动画，双指缩放仍实时跟手。' })
    public zoomDuration: number = WORLD.map.zoomSeconds;

    @property({ displayName: '地图边缘余量', min: 0, tooltip: '地图边缘在屏幕外额外保留的距离，越大越不容易看到边缘。' })
    public edgePadding: number = WORLD.map.edgePadding;

    private readonly _lastPointerPosition = new Vec3();
    private readonly _pinchStartCenter = new Vec3();
    private readonly _pinchWorldPoint = new Vec3();
    private _pinchTouchIds: number[] = [];
    private _isDragging = false;
    private _isPinching = false;
    private _pinchStartDistance = 0;
    private _pinchStartScale = 1;
    private _targetZoom = 1;
    private _zoomTween: Tween<Node> | null = null;
    public enteringNewColony = false;
    private entryFade: Node | null = null;
    private entryRevealing = false;

    onLoad(): void {
        this.enteringNewColony=consumeGameFadeIn();
        if(this.enteringNewColony)this.fadeIntoNewColony();
        if(this.worldRoot&&!this.worldRoot.getComponent(ColonySession))this.worldRoot.addComponent(ColonySession);
    }

    private keys=new Set<number>();
    private keyDown(e:EventKeyboard):void {if(this.cinematic)return;this.keys.add(e.keyCode);if([KeyCode.EQUAL,KeyCode.NUM_PLUS].includes(e.keyCode))this.setZoom(this._targetZoom+this.zoomStep);if([KeyCode.DASH,KeyCode.NUM_SUBTRACT].includes(e.keyCode))this.setZoom(this._targetZoom-this.zoomStep);}
    private keyUp(e:EventKeyboard):void {this.keys.delete(e.keyCode);}
    update(dt:number):void {
        if(this.enteringNewColony&&!this.entryRevealing&&this.worldRoot?.getComponent(ColonySession)?.isReady)this.revealNewColony();
        if(this.cinematic||!this.worldRoot)return;const has=(...keys:number[])=>keys.some(k=>this.keys.has(k)),x=Number(has(KeyCode.KEY_A,KeyCode.ARROW_LEFT))-Number(has(KeyCode.KEY_D,KeyCode.ARROW_RIGHT)),y=Number(has(KeyCode.KEY_S,KeyCode.ARROW_DOWN))-Number(has(KeyCode.KEY_W,KeyCode.ARROW_UP));if(x||y){this.stopZoomTween();this.worldRoot.setPosition(this.worldRoot.position.x+x*600*dt,this.worldRoot.position.y+y*600*dt);this.clampWorldPosition();}}
    onEnable(): void {
        this.node.on(Node.EventType.SIZE_CHANGED, this.onViewportResize, this);
        input.on(Input.EventType.KEY_DOWN,this.keyDown,this);input.on(Input.EventType.KEY_UP,this.keyUp,this);
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onPointerEnd, this);

        // Mouse input makes the same control testable in the editor preview.
        this.node.on(Node.EventType.MOUSE_DOWN, this.onMouseDown, this);
        this.node.on(Node.EventType.MOUSE_MOVE, this.onMouseMove, this);
        this.node.on(Node.EventType.MOUSE_UP, this.onPointerEnd, this);
        this.node.on(Node.EventType.MOUSE_LEAVE, this.onPointerEnd, this);
        this.node.on(Node.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
    }

    onDisable(): void {
        this.node.off(Node.EventType.SIZE_CHANGED, this.onViewportResize, this);
        input.off(Input.EventType.KEY_DOWN,this.keyDown,this);input.off(Input.EventType.KEY_UP,this.keyUp,this);this.keys.clear();
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onPointerEnd, this);
        this.node.off(Node.EventType.MOUSE_DOWN, this.onMouseDown, this);
        this.node.off(Node.EventType.MOUSE_MOVE, this.onMouseMove, this);
        this.node.off(Node.EventType.MOUSE_UP, this.onPointerEnd, this);
        this.node.off(Node.EventType.MOUSE_LEAVE, this.onPointerEnd, this);
        this.node.off(Node.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
        this.onPointerEnd();
        this.stopZoomTween();
    }

    start(): void {
        this.onViewportResize();
    }

    private fadeIntoNewColony():void {
        const transform=this.node.getComponent(UITransform);if(!transform)return;
        const overlay=this.entryFade=new Node('DepartureFadeIn');overlay.layer=this.node.layer;this.node.addChild(overlay);
        overlay.addComponent(UITransform).setContentSize(10000,10000);
        addBlackFadeSprite(overlay);
        overlay.addComponent(BlockInputEvents);
        const opacity=overlay.addComponent(UIOpacity);opacity.opacity=255;
        overlay.setSiblingIndex(this.node.children.length-1);
        this.cinematic=true;
    }
    private revealNewColony():void {
        this.entryRevealing=true;
        const overlay=this.entryFade!;
        overlay.setSiblingIndex(this.node.children.length-1);
        // Original Global.__HzFy reveals the returning colony's rate panels over 10 seconds.
        for(const name of ['Growth','Progress']){
            const panel=this.node.getChildByPath('UI/GameHUD/RateStatusPanel/'+name);
            if(panel){const opacity=panel.getComponent(UIOpacity)||panel.addComponent(UIOpacity);opacity.opacity=0;tween(opacity).to(10,{opacity:255}).start();}
        }
        tween(overlay.getComponent(UIOpacity)!).to(1.5,{opacity:0}).call(()=>{
            if(isValid(overlay,true))overlay.destroy();
            this.entryFade=null;this.enteringNewColony=false;this.cinematic=false;
        }).start();
    }

    /** Original camera move; world-local target, current zoom preserved unless requested. */
    public cinematic=false;
    public focusWorldPoint(point: Vec3, seconds: number, force=false, targetZoom?:number): void {
        if(!force&&!preferences.camera)return;
        if (!this.worldRoot) return;
        this.stopZoomTween(); this.onPointerEnd();
        const scale = this.worldRoot.scale;
        const zoom=this.clampZoom(targetZoom===undefined?scale.x:targetZoom);
        this._targetZoom=zoom;
        this._zoomTween = tween(this.worldRoot).to(seconds, {
            position: new Vec3(-point.x * zoom, -point.y * zoom, this.worldRoot.position.z),
            scale: new Vec3(zoom,zoom,scale.z),
        }, { easing:'quintOut', onUpdate:()=>this.clampWorldPosition() })
            .call(()=>{this._zoomTween=null;}).start();
    }

    private onTouchStart(event: EventTouch): void {
        if(this.cinematic)return;
        if (event.getAllTouches().length >= 2) {
            if (!this._isPinching || !this.pinchTouches(event)) this.beginPinch(event);
            return;
        }
        this.beginDrag(event);
    }

    private onTouchMove(event: EventTouch): void {
        if(this.cinematic)return;
        if (event.getAllTouches().length >= 2) {
            if (!this._isPinching || !this.pinchTouches(event)) {
                this.beginPinch(event);
            }
            this.pinch(event);
            return;
        }
        this.drag(event);
    }

    private onMouseDown(event: EventMouse): void {
        if(this.cinematic || this._isPinching)return;
        this.beginDrag(event);
    }

    private onMouseMove(event: EventMouse): void {
        if(this.cinematic || this._isPinching)return;
        if (event.getButton() === EventMouse.BUTTON_LEFT || this._isDragging) {
            this.drag(event);
        }
    }

    private onPointerEnd(): void {
        this._isDragging = false;
        this._isPinching = false;
        this._pinchTouchIds.length = 0;
    }

    private onTouchEnd(event: EventTouch): void {
        if (this.cinematic || (!this._isDragging && !this._isPinching)) { this.onPointerEnd(); return; }
        const remaining = event.getAllTouches();
        if (remaining.length >= 2) {
            // Keep a stable pair when an unrelated third finger is lifted.
            if (!this.pinchTouches(event)) this.beginPinch(event);
        } else if (remaining.length === 1) {
            this.onPointerEnd();
            this.stopZoomTween();
            this._isDragging = true;
            // Start dragging at the surviving finger, not the lifted finger's position.
            this.copyCanvasPosition(remaining[0], this._lastPointerPosition);
        } else this.onPointerEnd();
    }

    private onMouseWheel(event: EventMouse): void {
        if(this.cinematic)return;
        const zoomDelta = event.getScrollY() > 0 ? this.zoomStep : -this.zoomStep;
        const focalPoint = new Vec3();
        this.copyCanvasPosition(event, focalPoint);
        this.setZoom(this._targetZoom + zoomDelta, focalPoint);
    }

    private beginDrag(event: EventTouch | EventMouse): void {
        if (!this.worldRoot) {
            return;
        }

        this.stopZoomTween();
        this._isDragging = true;
        this.copyCanvasPosition(event, this._lastPointerPosition);
    }

    private drag(event: EventTouch | EventMouse): void {
        if (!this._isDragging || !this.worldRoot) {
            return;
        }

        const currentPointerPosition = new Vec3();
        this.copyCanvasPosition(event, currentPointerPosition);
        const deltaX = currentPointerPosition.x - this._lastPointerPosition.x;
        const deltaY = currentPointerPosition.y - this._lastPointerPosition.y;

        this.worldRoot.setPosition(
            this.worldRoot.position.x + deltaX,
            this.worldRoot.position.y + deltaY,
            this.worldRoot.position.z,
        );
        this._lastPointerPosition.set(currentPointerPosition);
        this.clampWorldPosition();
    }

    private beginPinch(event: EventTouch): void {
        if (!this.worldRoot) {
            return;
        }

        const touches = event.getAllTouches();
        if (touches.length < 2) {
            return;
        }

        this.stopZoomTween();
        this._isDragging = false;
        this._isPinching = true;
        this._pinchTouchIds = [touches[0].getID(), touches[1].getID()];
        this._pinchStartDistance = this.getTouchDistance(event);
        this._pinchStartScale = this.worldRoot.scale.x;
        this.copyTouchCenter(event, this._pinchStartCenter);
        this.capturePinchAnchor();
    }

    private pinch(event: EventTouch): void {
        if (!this.worldRoot || !this._isPinching) {
            return;
        }
        const distance = this.getTouchDistance(event);
        if (distance < 1 || this._pinchStartDistance < 1) { this.beginPinch(event); return; }
        this.copyTouchCenter(event, this._pinchStartCenter);
        const requested = this._pinchStartScale * distance / this._pinchStartDistance;
        const scale = this.clampZoom(requested);
        // Direct manipulation must follow this event, never a repeatedly restarted tween.
        this.worldRoot.setScale(scale, scale, this.worldRoot.scale.z);
        this.worldRoot.setPosition(
            this._pinchStartCenter.x - this._pinchWorldPoint.x * scale,
            this._pinchStartCenter.y - this._pinchWorldPoint.y * scale,
            this.worldRoot.position.z,
        );
        this.clampWorldPosition();
        this._targetZoom = scale;
        // Rebase at the limits so reversing the gesture responds immediately.
        this._pinchStartDistance = distance;
        this._pinchStartScale = scale;
        this.capturePinchAnchor();
    }

    private capturePinchAnchor(): void {
        const world = this.worldRoot!;
        this._pinchWorldPoint.set(
            (this._pinchStartCenter.x - world.position.x) / world.scale.x,
            (this._pinchStartCenter.y - world.position.y) / world.scale.y,
            0,
        );
    }

    private pinchTouches(event: EventTouch): [Touch, Touch] | null {
        const touches = event.getAllTouches();
        const first = touches.find(touch => touch.getID() === this._pinchTouchIds[0]);
        const second = touches.find(touch => touch.getID() === this._pinchTouchIds[1]);
        return first && second ? [first, second] : null;
    }

    /** Can be bound directly to a UI magnifier button in the Cocos editor. */
    public zoomIn(): void {
        this.setZoom(this._targetZoom + this.zoomStep);
    }

    /** Can be bound directly to a UI magnifier button in the Cocos editor. */
    public zoomOut(): void {
        this.setZoom(this._targetZoom - this.zoomStep);
    }

    /**
     * Changes scale around a screen-space focal point, keeping that point under
     * the fingers (or mouse) instead of snapping the map toward its centre.
     */
    private setZoom(requestedScale: number, focalPoint?: Vec3): void {
        if (!this.worldRoot) {
            return;
        }

        const nextScale = this.clampZoom(requestedScale);
        const currentScale = this.worldRoot.scale.x;
        if (Math.abs(nextScale - this._targetZoom) < 0.0001) {
            return;
        }
        this._targetZoom = nextScale;

        this.stopZoomTween();
        this._targetZoom = nextScale;

        const targetPosition = this.worldRoot.position.clone();
        if (focalPoint && currentScale > 0) {
            const ratio = nextScale / currentScale;
            const position = this.worldRoot.position;
            targetPosition.set(
                focalPoint.x + (position.x - focalPoint.x) * ratio,
                focalPoint.y + (position.y - focalPoint.y) * ratio,
                position.z,
            );
        }

        this._zoomTween = tween(this.worldRoot)
            .to(
                this.zoomDuration,
                {
                    position: targetPosition,
                    scale: new Vec3(nextScale, nextScale, this.worldRoot.scale.z),
                },
                {
                    easing: 'quadOut',
                    onUpdate: () => this.clampWorldPosition(),
                },
            )
            .call(() => {
                this.clampWorldPosition();
                this._zoomTween = null;
            })
            .start();
    }

    private stopZoomTween(): void {
        this._zoomTween?.stop();
        this._zoomTween = null;
        if (this.worldRoot) {
            this._targetZoom = this.worldRoot.scale.x;
        }
    }

    /** Converts the pointer into the Canvas's design-resolution coordinate system. */
    private copyCanvasPosition(event: EventTouch | EventMouse | Touch, out: Vec3): void {
        const location = event.getUILocation();
        const canvasTransform = this.node.getComponent(UITransform);
        if (!canvasTransform) {
            out.set(location.x, location.y, 0);
            return;
        }

        canvasTransform.convertToNodeSpaceAR(new Vec3(location.x, location.y, 0), out);
    }

    private copyTouchCenter(event: EventTouch, out: Vec3): void {
        const touches = this.pinchTouches(event);
        if (!touches) return;
        const firstLocation = touches[0].getUILocation();
        const secondLocation = touches[1].getUILocation();
        const canvasTransform = this.node.getComponent(UITransform);
        const centerX = (firstLocation.x + secondLocation.x) / 2;
        const centerY = (firstLocation.y + secondLocation.y) / 2;
        if (!canvasTransform) {
            out.set(centerX, centerY, 0);
            return;
        }

        canvasTransform.convertToNodeSpaceAR(new Vec3(centerX, centerY, 0), out);
    }

    private getTouchDistance(event: EventTouch): number {
        const touches = this.pinchTouches(event);
        if (!touches) return 0;
        const firstLocation = touches[0].getUILocation();
        const secondLocation = touches[1].getUILocation();
        return Math.hypot(secondLocation.x - firstLocation.x, secondLocation.y - firstLocation.y);
    }

    /** All zoom inputs share the same screen-dependent safety floor. */
    public getZoomLimits(): { min: number; max: number } {
        const canvas = this.node.getComponent(UITransform);
        const map = this.worldRoot?.getChildByName('game_bg')?.getComponent(UITransform)?.getBoundingBox();
        const padding = Number.isFinite(this.edgePadding) ? Math.max(0, this.edgePadding) : 0;
        const cover = canvas && map && map.width > 0 && map.height > 0
            ? Math.max((canvas.width + padding * 2) / map.width, (canvas.height + padding * 2) / map.height) : 0;
        const min = Math.max(0.01, Number.isFinite(this.minZoom) ? this.minZoom : WORLD.map.minZoom, cover);
        return { min, max: Math.max(min, Number.isFinite(this.maxZoom) ? this.maxZoom : WORLD.map.maxZoom) };
    }

    private clampZoom(value: number): number {
        const limits = this.getZoomLimits();
        return Math.max(limits.min, Math.min(limits.max, Number.isFinite(value) ? value : limits.min));
    }

    private onViewportResize(): void {
        this.stopZoomTween();
        this.onPointerEnd();
        this.clampWorldPosition();
        if (this.worldRoot) this._targetZoom = this.worldRoot.scale.x;
    }

    /** Prevents empty edges during dragging, zoom animations and viewport resizing. */
    private clampWorldPosition(): void {
        if (!this.worldRoot) {
            return;
        }

        const canvasTransform = this.node.getComponent(UITransform);
        const background = this.worldRoot.getChildByName('game_bg');
        const backgroundTransform = background?.getComponent(UITransform);
        if (!canvasTransform || !backgroundTransform) {
            return;
        }

        const zoom = this.clampZoom(this.worldRoot.scale.x);
        if (zoom !== this.worldRoot.scale.x || zoom !== this.worldRoot.scale.y) {
            this.worldRoot.setScale(zoom, zoom, this.worldRoot.scale.z);
            this._targetZoom = this.clampZoom(this._targetZoom);
        }
        // Include the background's authored position, scale and anchor instead
        // of assuming it is centered at the origin.
        const map = backgroundTransform.getBoundingBox();
        const padding = Number.isFinite(this.edgePadding) ? Math.max(0, this.edgePadding) : 0;
        const left = -canvasTransform.width * canvasTransform.anchorX;
        const bottom = -canvasTransform.height * canvasTransform.anchorY;
        const minX = left + canvasTransform.width + padding - (map.x + map.width) * zoom;
        const maxX = left - padding - map.x * zoom;
        const minY = bottom + canvasTransform.height + padding - (map.y + map.height) * zoom;
        const maxY = bottom - padding - map.y * zoom;
        const position = this.worldRoot.position;
        this.worldRoot.setPosition(
            minX > maxX ? (minX + maxX) / 2 : Math.max(minX, Math.min(maxX, position.x)),
            minY > maxY ? (minY + maxY) / 2 : Math.max(minY, Math.min(maxY, position.y)),
            position.z,
        );
    }

}
