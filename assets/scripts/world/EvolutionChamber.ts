import { playOriginalSound } from "../core/OriginalSound";
import { isValid } from 'cc';
import { preferences } from '../core/PlayerMeta';
import { _decorator, AudioClip, AudioSource, Component, EventTouch, Node, Sprite, SpriteFrame, Tween, tween, UITransform, Vec3 } from 'cc';
import { BUILDING_POSITIONS } from '../config/MapConfig';
import { UI_RULES } from '../config/UIConfig';
import { WORLD } from '../config/WorldConfig';
import { GameScene } from '../scene/GameScene';
import { FacilityUpgradePanel } from '../ui/FacilityUpgradePanel';
import { WorldLayers } from './WorldLayers';
import { ColonyPrefabs } from './ColonyPrefabs';
import { playBuildingClickEffect } from './FacilitySupport';

const { ccclass, property } = _decorator;
const PURCHASE_ID = 'queen_BuildingEvolutionChamber';

/** Original BuildingEvolution: one world actor, created when its queen upgrade is bought. */
@ccclass('EvolutionChamber')
export class EvolutionChamber extends Component {
    @property(SpriteFrame) art: SpriteFrame | null = null;
    @property(FacilityUpgradePanel) upgrades: FacilityUpgradePanel | null = null;
    @property(AudioClip) introSound: AudioClip | null = null;

    private building: Node | null = null;
    private visuals: Node | null = null;
    private sprite: Node | null = null;
    private brainScale = 0.5;
    private ready = false;
    private pointer: number | null = null;
    private origin = { x: 0, y: 0 };
    private moved = false;
    private introProgress: { x: number; y: number } | null = null;
    private prefabCatalogReady = false;
    private pendingPurchaseAnimation = false;

    onEnable(): void { this.upgrades?.node.on('upgrade-purchased', this.onPurchased, this); }
    onDisable(): void {
        this.upgrades?.node.off('upgrade-purchased', this.onPurchased, this);
        this.pointer = null;
    }
    /** Called after ColonyPrefabs finishes loading the runtime prefab catalog. */
    public onPrefabCatalogReady(): void {
        this.prefabCatalogReady = true;
        if (this.upgrades?.upgradeState.level(PURCHASE_ID))
            this.spawn(this.pendingPurchaseAnimation);
    }

    private onPurchased(event: { id: string }): void {
        if (event.id !== PURCHASE_ID) return;
        // The upgrade panel can be used while the async startup overlay is up.
        // Defer creating the chamber until its prefab is available.
        if (!this.prefabCatalogReady) {
            this.pendingPurchaseAnimation = true;
            return;
        }
        this.spawn(true);
    }

    private spawn(animate: boolean): void {
        if (this.building || !this.art) return;
        const layers = this.node.getComponent(WorldLayers)!;
        layers.ensureLayers();
        const building = this.building = this.getComponent(ColonyPrefabs)!.create('EvolutionChamber',layers.actors,'BuildingEvolution');
        building.setPosition(...BUILDING_POSITIONS.evolution, 0);

        const visuals = this.visuals = building.getChildByName('Visuals')!;
        visuals.setScale(this.brainScale, this.brainScale, 1);
        this.sprite = visuals.getChildByName('Sprite2D')!;

        // A single hit target covers the art at the original 0.5 visual scale.
        const hit = building.getChildByName('Interact')!;
        hit.on(Node.EventType.TOUCH_START, this.begin, this);
        hit.on(Node.EventType.TOUCH_MOVE, this.move, this);
        hit.on(Node.EventType.TOUCH_CANCEL, this.cancel, this);
        hit.on(Node.EventType.TOUCH_END, this.end, this);
        layers.sortActors();

        if (!animate) { this.ready = true; return; }
        const config = WORLD.building;
        building.setScale(0, 0, 1);
        if (config.moveOnBuy) this.node.parent?.getComponent(GameScene)?.focusWorldPoint(building.position, config.introDelay);
        this.scheduleOnce(() => {
            if (!building.isValid) return;
            this.ready = true;
            if (this.introSound) {
                const audio = this.getComponent(AudioSource) || this.addComponent(AudioSource);
                playOriginalSound("InflateArpeggio",config.introVolume);
            }
            const progress = this.introProgress = { x: 0, y: 0 };
            const apply = () => building.setScale(progress.x, progress.y, 1);
            tween(progress).to(config.introXSeconds, { x: 1 }, { easing: 'elasticOut', onUpdate: apply }).start();
            tween(progress).to(config.introYSeconds, { y: 1 }, { easing: 'elasticOut', onUpdate: apply }).start();
        }, config.introDelay);
    }

    public get deliveryPosition(): Vec3 | null {
        if (!this.building || !isValid(this.building, true)) return null;
        return this.node.getComponent(UITransform)!.convertToNodeSpaceAR(this.building.worldPosition);
    }

    public snapshot(): { brainScale: number } { return { brainScale: this.brainScale }; }
    public restore(saved?: { brainScale: number }): void {
        this.brainScale = saved?.brainScale ?? .5;
        this.visuals?.setScale(this.brainScale, this.brainScale, 1);
    }

    /** Called on grey-matter arrival, matching building_evolution.gd. */
    public grow(): void {
        this.brainScale += 0.2;
        if (!this.visuals) return;
        Tween.stopAllByTarget(this.visuals);
        tween(this.visuals).to(1, { scale: new Vec3(this.brainScale, this.brainScale, 1) }, { easing: 'elasticOut' }).start();
    }

    private begin(event: EventTouch): void {
        if (this.pointer !== null || event.getAllTouches().length > 1) { this.moved = true; return; }
        const position = event.getLocation();
        this.pointer = event.getID(); this.origin = { x: position.x, y: position.y }; this.moved = false;
    }
    private move(event: EventTouch): void {
        const position = event.getLocation();
        if (event.getAllTouches().length > 1 || Math.hypot(position.x - this.origin.x, position.y - this.origin.y) > UI_RULES.dragTolerance) this.moved = true;
    }
    private cancel(): void { this.pointer = null; this.moved = true; }
    private end(event: EventTouch): void {
        if (event.getID() !== this.pointer) return;
        this.move(event);
        const clicked = !this.moved && this.ready;
        this.cancel();
        if (!clicked || !this.sprite) return;
        playBuildingClickEffect(this.sprite);
        this.node.emit('evolution-chamber-clicked');
    }

    onDestroy(): void {
        this.unscheduleAllCallbacks();
        if (this.introProgress) Tween.stopAllByTarget(this.introProgress);
        if (this.visuals) Tween.stopAllByTarget(this.visuals);
        if (this.sprite) Tween.stopAllByTarget(this.sprite);
        if(this.building&&isValid(this.building,true))this.building.destroy();
    }
}
