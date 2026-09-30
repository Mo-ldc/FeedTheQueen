import { _decorator, Component, Node, Prefab, instantiate, isValid } from 'cc';
import { WORLD } from '../config/WorldConfig';
import { BUILDING_POSITIONS } from '../config/MapConfig';
import { FacilityUpgradePanel } from '../ui/FacilityUpgradePanel';
import { BlueberryFeeding } from './BlueberryFeeding';
import { Hauler } from './Hauler';
import { WorldLayers } from './WorldLayers';
import { reserveWorldSpawn } from './WorldSpawnQueue';

const { ccclass, property } = _decorator;

@ccclass('HaulerPopulation')
export class HaulerPopulation extends Component {
    @property(Prefab) haulerPrefab: Prefab | null = null;
    @property(FacilityUpgradePanel) upgrades: FacilityUpgradePanel | null = null;
    @property(BlueberryFeeding) feeding: BlueberryFeeding | null = null;
    @property(Node) queen: Node | null = null;

    private workers: Hauler[] = [];
    private ready = false;
    private priorityMode = 0;
    onEnable(): void {
        this.upgrades?.node.on('upgrade-purchased', this.onPurchase, this);
        this.upgrades?.node.on('hauler-priority-changed', this.onPriorityChanged, this);
    }
    onDisable(): void {
        this.upgrades?.node.off('upgrade-purchased', this.onPurchase, this);
        this.upgrades?.node.off('hauler-priority-changed', this.onPriorityChanged, this);
    }
    start(): void {
        if (!this.haulerPrefab || !this.upgrades || !this.feeding || !this.queen) {
            console.error('HaulerPopulation: missing scene references'); return;
        }
        this.node.getComponent(WorldLayers)!.ensureLayers();
        this.ready = true;
        this.synchronize();
    }
    private onPurchase(event: {id: string}): void {
        if (event.id.startsWith('haulers_') || event.id === 'queen_BuildingHaulers') this.synchronize();
    }
    private onPriorityChanged(mode: number): void { this.priorityMode = mode; this.synchronize(); }
    public synchronize(): void {
        if (!this.ready || !this.haulerPrefab || !this.upgrades || !this.feeding || !this.queen) return;
        const effects = this.upgrades.upgradeState.effects;
        this.workers = this.workers.filter(worker => isValid(worker.node, true));
        const actors = this.node.getComponent(WorldLayers)!.actors;
        while (this.workers.length < effects.haulers) {
            if (!reserveWorldSpawn(this, () => this.synchronize())) break;
            const node = instantiate(this.haulerPrefab);
            node.name="WestHauler"+this.workers.length;actors.addChild(node);
            node.setPosition(...BUILDING_POSITIONS.haulers, 0);
            const worker = node.getComponent(Hauler)!;
            worker.initialize(this.feeding, this.queen);
            this.workers.push(worker);
        }
        while (this.workers.length > effects.haulers) this.workers.pop()!.retire();
        for (const worker of this.workers) worker.configure(
            WORLD.hauler.speed + effects.haulerSpeedBonus,
            1 + effects.haulerCapacityBonus,
            this.priorityMode,
        );
        this.node.getComponent(WorldLayers)!.sortActors();
    }
    public get count(): number { return this.workers.length; }
    onDestroy(): void {
        for (const worker of this.workers) if (isValid(worker.node, true)) worker.retire();
        this.workers = [];
    }
}
