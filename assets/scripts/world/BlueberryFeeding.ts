import { playOriginalSound } from "../core/OriginalSound";
import type { SavedFlight } from "../core/ColonyPersistence";
import { preferences, unlockAchievement } from '../core/PlayerMeta';
import { WORLD } from '../config/WorldConfig';
import { BLUEBERRY } from '../config/ItemConfig';
import { FLOATING_TEXT, floatingTextStyle } from '../config/FloatingTextConfig';
import { _decorator, Component, Node, Prefab, SpriteFrame, Sprite, UITransform, Vec3, instantiate, input, Input, EventTouch, isValid, tween, Tween, Label, UIOpacity, Color } from 'cc';
import { BlueberryBush } from './BlueberryBush';
import { INITIAL_BUSHES, BUSH_ZONE } from '../config/MapConfig';
import { insidePolygon } from './BlueberryRules';
import { FeedingRateLedger } from './FeedingRateLedger';
import { FacilityUpgradePanel } from '../ui/FacilityUpgradePanel';
import { GameHUD } from '../ui/GameHUD';
import { WorldLayers } from './WorldLayers';
import { Food, FeedingModel } from '../core/FeedingModel';
import { FoodSource, FoodRelay, FoodReceiver } from './FoodSource';
import { originalFrame, foodFramePath } from './OriginalArt';
import { colonySave, ColonySnapshot } from '../core/ColonyPersistence';
const { ccclass, property } = _decorator;
interface Flight { delay?: number; storage?: FoodSource; storageGeneration?: number; node: Node | null; start: Vec3; age: number; duration: number; height: number; food: Food; target?: () => Vec3; arrive?: () => void; saveAsFood?: boolean; receiver?: FoodReceiver; receiverGeneration?: number; route?: SavedFlight["route"]; }
@ccclass('BlueberryFeeding')
export class BlueberryFeeding extends Component {
    @property(Prefab) bushPrefab: Prefab | null = null;
    @property({ type: Prefab, displayName: '蚁后进食飘字', tooltip: '在 Label 中调整字体、描边宽度、字间距等样式；显示字号按数值在 24～50 之间缩放，颜色由食物类型控制。' })
    floatingTextPrefab: Prefab | null = null;
    @property(SpriteFrame) berryFrame: SpriteFrame | null = null;
    @property(Node) queen: Node | null = null;
    @property(FacilityUpgradePanel) upgrades: FacilityUpgradePanel | null = null;
    @property(GameHUD) hud: GameHUD | null = null;
    @property({ min: 0 }) queenLevel = 0;
    private bushes = new Set<BlueberryBush>();
    private flights: Flight[] = [];
    private freeFlights: Node[] = []; private restoringFlights: SavedFlight[] = []; private restoreAge = 0;
    private visualFoodCounts = new Map<number, number>();
    private totalVisualCount = 0;
    private lastChompTime = 0;

    public getMaxVisualForFood(food: Food): number {
        const config = (WORLD.flight as any).maxVisualByFood;
        if (config && typeof config[food] === 'number') return config[food];
        return (WORLD.flight as any).defaultMaxVisualPerItem ?? 30;
    }

    private canRenderFood(food: Food): boolean {
        const maxForFood = this.getMaxVisualForFood(food);
        const currentForFood = this.visualFoodCounts.get(food) || 0;
        const maxTotal = (WORLD.flight as any).maxTotalVisual ?? 120;
        return currentForFood < maxForFood && this.totalVisualCount < maxTotal;
    }

    private incrementVisualCount(food: Food): void {
        this.visualFoodCounts.set(food, (this.visualFoodCounts.get(food) || 0) + 1);
        this.totalVisualCount++;
    }

    private decrementVisualCount(food: Food): void {
        const current = this.visualFoodCounts.get(food) || 0;
        if (current > 0) this.visualFoodCounts.set(food, current - 1);
        if (this.totalVisualCount > 0) this.totalVisualCount--;
    }
    public readonly window = new FeedingRateLedger();
    public readonly tastes = new FeedingModel();
    private sources = new Set<FoodSource>();
    private relays = new Set<FoodRelay>();
    private receivers = new Set<FoodReceiver>();
    private fallbackEating = false;
    private fallbackPendingEat = false;
    public registerReceiver(receiver: FoodReceiver): void { this.receivers.add(receiver); }
    public unregisterReceiver(receiver: FoodReceiver): void { this.receivers?.delete(receiver); }
    public receiverFor(food: Food): FoodReceiver | null {
        for (const receiver of this.receivers) if (isValid(receiver.node, true) && receiver.node.activeInHierarchy && receiver.accepts(food)) return receiver;
        return null;
    }
    public deliver(origin: Vec3, food: Food, seconds = 1, height = 300): void {
        // Keep a map-local copy for fallback launches. `origin` is a scene-world
        // point and becomes stale if the camera zooms before the flight arrives.
        const originLocal = this.flightTransform().convertToNodeSpaceAR(origin);
        const receiver = this.receiverFor(food);
        if (receiver && receiver.reserveInput(food)) {
            const generation = receiver.generation; const count = this.flights.length;
            this.launch(origin, food, () => isValid(receiver.node, true) ? receiver.deliveryPosition() : this.queen!.worldPosition.clone(), () => {
                if (!isValid(receiver.node, true) || receiver.generation !== generation || !receiver.receiveInput(food)) this.launch(this.flightTransform().convertToWorldSpaceAR(originLocal), food, undefined, undefined, .01, 0);
            }, seconds, height);
            if (this.flights.length > count) { const flight = this.flights[this.flights.length - 1]; flight.receiver = receiver; flight.receiverGeneration = generation; flight.route = { kind: "receiver", name: receiver.node.name }; }
        } else this.launch(origin, food, undefined, undefined, seconds, height);
    }
    public launchHarvest(origin: Vec3, food: Food, storage: FoodSource, seconds: number, height: number, delay = 0): void {
        const generation = storage.generation, before = this.flights.length;
        this.launch(origin, food, () => storage.harvestPosition!(), () => { if (isValid(storage.node, true) && storage.generation === generation) storage.finishHarvest!(); }, seconds, height, true, { kind: 'storage', name: storage.node.name });
        if (this.flights.length > before) { storage.beginHarvest!(); const f = this.flights[this.flights.length - 1]; f.storage = storage; f.storageGeneration = generation; f.delay = delay; if (f.node) f.node.active = delay <= 0; }
    }
    public pendingInputs(): Record<string, Record<number, number>> { const result: Record<string, Record<number, number>> = {}; for (const f of this.flights) if (f.receiver && f.receiver.generation === f.receiverGeneration) { const counts = result[f.receiver.node.name] ??= {}; counts[f.food] = (counts[f.food] || 0) + 1; } return result; }
    private restoreFlights(dt: number): void {
        if (!this.restoringFlights.length) return; this.restoreAge += dt; const transform = this.flightTransform();
        for (let i = this.restoringFlights.length - 1; i >= 0; i--) {
            const f = this.restoringFlights[i], route = f.route; let target: (() => Vec3) | undefined, arrive: (() => void) | undefined, receiver: FoodReceiver | undefined, storage: FoodSource | undefined;
            if (route?.kind === 'relay') { const relay = this.findRelay(route.name!); if (!relay && this.restoreAge < 10) continue; if (relay) { target = () => relay.deliveryPosition(); arrive = () => isValid(relay.node, true) ? relay.receiveRelay(f.food) : this.launch(transform.convertToWorldSpaceAR(new Vec3(f.x, f.y)), f.food); } }
            if (route?.kind === 'receiver') { receiver = [...this.receivers].find(r => r.node.name === route.name); if (!receiver && this.restoreAge < 10) continue; if (receiver) { const r = receiver, generation = r.generation; r.reserveInput(f.food); target = () => r.deliveryPosition(); arrive = () => { if (!isValid(r.node, true) || r.generation !== generation || !r.receiveInput(f.food)) this.launch(transform.convertToWorldSpaceAR(new Vec3(f.x, f.y)), f.food); }; } }
            if (route?.kind === 'storage') { storage = [...this.sources].find(s => s.node.name === route.name && !!s.finishHarvest); if (!storage && this.restoreAge < 10) continue; if (storage) { const s = storage, generation = s.generation; s.beginHarvest!(); target = () => s.harvestPosition!(); arrive = () => { if (isValid(s.node, true) && s.generation === generation) s.finishHarvest!(); }; } }
            if (route?.kind === 'tunnel') { target = () => transform.convertToWorldSpaceAR(new Vec3(f.targetX!, f.targetY!)); arrive = () => this.deliver(transform.convertToWorldSpaceAR(new Vec3(route.exitX!, route.exitY!)), f.food, 1.5, 450); }
            const before = this.flights.length; this.launch(transform.convertToWorldSpaceAR(new Vec3(f.startX ?? f.x, f.startY ?? f.y)), f.food, target, arrive, f.duration, f.height, route?.kind === 'relay' || route?.kind === 'tunnel' || route?.kind === 'storage', route); if (this.flights.length === before) continue;
            const current = this.flights[this.flights.length - 1]; current.age = Math.max(0, (f.age || 0) - dt); current.height = f.height; current.delay = f.delay || 0; if (current.node) { current.node.active = !current.delay; current.node.setPosition(f.x, f.y); } if (storage) { current.storage = storage; current.storageGeneration = storage.generation; } if (receiver) { current.receiver = receiver; current.receiverGeneration = receiver.generation; } this.restoringFlights.splice(i, 1);
        }
    }
    public registerRelay(relay: FoodRelay): void { this.relays.add(relay); }
    public unregisterRelay(relay: FoodRelay): void { this.relays?.delete(relay); }
    public claimRelay(from: Vec3): FoodRelay | null {
        const distance = Vec3.squaredDistance(from, this.queen!.position);
        for (const relay of this.relays) if (isValid(relay.node, true) && Vec3.squaredDistance(from, relay.node.position) <= distance && relay.claimRelay()) return relay;
        return null;
    }
    public launchToRelay(origin: Vec3, food: Food, relay: FoodRelay): void {
        const originLocal = this.flightTransform().convertToNodeSpaceAR(origin);
        const count = this.flights.length;
        this.launch(origin, food, () => isValid(relay.node, true) ? relay.deliveryPosition() : this.queen!.getChildByName('mouth')!.worldPosition.clone(), () => {
            if (isValid(relay.node, true)) relay.receiveRelay(food);
            else this.launch(this.flightTransform().convertToWorldSpaceAR(originLocal), food, undefined, undefined, .01, 0);
        }, .6, 200);
        // Unlike storage deliveries, relay food is not represented in any inventory.
        const flight = this.flights[this.flights.length - 1]; if (this.flights.length > count) { flight.saveAsFood = true; flight.route = { kind: "relay", name: relay.node.name }; }
    }
    private foodFrames = new Map<number, SpriteFrame>();
    private spriteFood = new WeakMap<Sprite, number>();
    private spawnElapsed = 0;
    private hudElapsed = 0;
    private touchEpoch = 0;
    private bushRoot: Node | null = null;
    private freeBushes: Node[] = [];
    private flightRoot: Node | null = null;
    private ownedBushes = new Set<Node>();
    private floatingLabels: Node[] = [];
    private freeFloatingLabels: Node[] = [];
    private activeFloating = 0;
    private floatingBaseScales = new WeakMap<Node, Vec3>();
    private floatingValues = new WeakMap<Node, { foodId: number; value: number; order: number }>();
    private floatingOrder = 0;
    private tasteOptionsDirty = true;
    private syncedTotalLarvae = -1;
    private syncedQueenLevel = -1;
    private syncedGenes: object | null = null;
    onEnable(): void {
        input.on(Input.EventType.TOUCH_START, this.trackMultiTouch, this);
        this.upgrades?.node.on('upgrade-purchased', this.markTasteOptionsDirty, this);
        this.upgrades?.node.on('genes-changed', this.markTasteOptionsDirty, this);
    }
    onDisable(): void {
        input.off(Input.EventType.TOUCH_START, this.trackMultiTouch, this);
        this.upgrades?.node.off('upgrade-purchased', this.markTasteOptionsDirty, this);
        this.upgrades?.node.off('genes-changed', this.markTasteOptionsDirty, this);
    }
    private markTasteOptionsDirty(): void { this.tasteOptionsDirty = true; }
    private trackMultiTouch(event: EventTouch): void { if (event.getAllTouches().length > 1) this.touchEpoch++; }
    start(): void {
        if (!this.bushPrefab || !this.berryFrame || !this.queen || !this.upgrades) { console.error('BlueberryFeeding: missing scene references'); return; }
        const layers = this.node.getComponent(WorldLayers) || this.node.addComponent(WorldLayers);
        layers.ensureLayers();
        this.bushRoot = layers.actors;
        if (this.queen.parent !== this.bushRoot) this.queen.setParent(this.bushRoot, true);
        this.flightRoot = layers.projectiles;
        this.foodFrames.set(Food.Blueberry, this.berryFrame);
        // Food art is loaded by setFoodSprite when that food first appears.
        const saved = colonySave.load();
        if (saved) { this.tastes.restore(saved.tastes); this.window.restore(saved.ledger); this.queenLevel = saved.progression.queenLevel; }
        if (saved?.foodWorld) {
            this.foragerFood = saved.foodWorld.foragerFood; this.spawnElapsed = saved.foodWorld.refillElapsed;
            for (const b of saved.foodWorld.bushes) { const bush = this.spawn(b.x, b.y, b.amount, undefined, b.food); if (bush) { bush.discoveryOwner = b.owner; bush.rainbow = !!b.rainbow; } }
            this.restoringFlights = saved.foodWorld.flights;
        } else for (const [x, y] of INITIAL_BUSHES) this.spawn(x, y, WORLD.blueberry.initialFruitCount);
        this.syncHUD();
    }
    private spawn(x: number, y: number, amount: number, onEmpty?: () => void, food = Food.Blueberry): BlueberryBush | null {
        if (!this.bushRoot || !this.bushPrefab) return null;
        let n = this.freeBushes.pop();
        if (!n) {
            n = instantiate(this.bushPrefab);
            const created = n;
            const component = n.getComponent(BlueberryBush)!;
            this.ownedBushes.add(n);
            n.on(Node.EventType.NODE_DESTROYED, () => {
                // A scene transition can destroy pooled bushes after this
                // component has already entered teardown and Cocos cleared its fields.
                this.ownedBushes?.delete(created);
                this.bushes?.delete(component);
            });
        }
        this.bushRoot.addChild(n); n.setPosition(x, y); n.active = true;
        const bush = n.getComponent(BlueberryBush)!; this.bushes.add(bush);
        bush.foodType = food;
        bush.discoveryOwner = -1;
        bush.initialize(amount, p => this.launch(p, food, undefined, undefined, undefined, WORLD.flight.heightMin + Math.random() * (WORLD.flight.heightMax - WORLD.flight.heightMin)), () => { this.bushes.delete(bush); onEmpty?.(); }, () => this.touchEpoch, () => this.recycleBush(n!));
        for (const berry of n.getChildByPath('Visual/Berries')!.children) this.setFoodSprite(berry, food);
        return bush;
    }
    private recycleBush(node: Node): void {
        node.active = false;
        node.removeFromParent();
        if (this.freeBushes.length < WORLD.blueberry.poolLimit) this.freeBushes.push(node);
        else node.destroy();
    }
    /** Forager discoveries share the same harvest, projectile and economy path. */
    public foragerFood = Food.Blueberry;
    public spawnDiscovered(x: number, y: number, amount: number, onEmpty: () => void, owner = -1): BlueberryBush | null {
        let count = this.foragerFood === Food.Apple ? Math.floor(amount / 5) : this.foragerFood === Food.Citrus ? Math.floor(amount / 2) : amount;
        if (this.foragerFood === Food.Apple && this.upgrades?.upgradeState.genes.gold_bushes) { let gold = 0; for (let i = 0; i < count; i++)if (Math.random() < (this.upgrades.upgradeState.level('mine_gold') ? .02 : .01)) gold++; count -= gold; if (gold) unlockAchievement('golden_bush'); for (let i = 0; i < gold; i++)this.deliver(this.node.getComponent(UITransform)!.convertToWorldSpaceAR(new Vec3(x, y + 100, 0)), Food.GoldenApple, 2, 600); }
        if (count <= 0) return null;
        const bush = this.spawn(x, y, count, onEmpty, this.foragerFood); if (bush) bush.discoveryOwner = owner; return bush;
    }

    public clearDiscoveredBushes(): void { for (const b of this.bushes) if (b.discoveryOwner >= 0) { this.bushes.delete(b); b.node.destroy(); } }
    public getAvailableBushes(): BlueberryBush[] {
        return Array.from(this.bushes).filter(bush => isValid(bush.node, true) && bush.remaining > 0);
    }
    /** Called once per throw, so cargo and projectiles stay synchronized. */
    public throwByHauler(origin: Vec3, food = Food.Blueberry): void { this.deliver(origin, food); }
    public findSource(key: { name: string; x: number; y: number; food: number }): FoodSource | null { return [...this.bushes, ...this.sources].find(s => isValid(s.node, true) && s.foodType === key.food && s.node.name === key.name && Math.abs(s.node.position.x - key.x) < .1 && Math.abs(s.node.position.y - key.y) < .1) || null; }
    public findRelay(name: string): FoodRelay | null { return [...this.relays].find(r => isValid(r.node, true) && r.node.name === name) || null; }
    public registerSource(source: FoodSource): void { this.sources.add(source); }
    public snapshotWorld(): ColonySnapshot['foodWorld'] {
        const bushes = Array.from(this.bushes).filter(b => isValid(b.node) && b.remaining + b.reserved > 0)
            .map(b => ({ x: b.node.position.x, y: b.node.position.y, amount: b.remaining + b.reserved, food: b.foodType, owner: b.discoveryOwner, rainbow: b.rainbow }));
        const flights: SavedFlight[] = [...this.restoringFlights, ...this.flights.filter(f => (!f.storage || f.storage.generation === f.storageGeneration) && (!f.arrive || f.saveAsFood || f.receiver)).map(f => {
            const target = f.target ? this.flightTransform().convertToNodeSpaceAR(f.target()) : null;
            const progress = Math.max(0, Math.min(1, f.age / Math.max(0.001, f.duration)));
            const dest = target || this.destination();
            const posX = f.node ? f.node.position.x : (f.start.x + (dest.x - f.start.x) * progress);
            const posY = f.node ? f.node.position.y : (f.start.y + (dest.y - f.start.y) * progress + 4 * f.height * progress * (1 - progress));
            return { x: posX, y: posY, food: f.food, startX: f.start.x, startY: f.start.y, age: f.age, delay: f.delay, duration: f.duration, height: f.height, targetX: target?.x, targetY: target?.y, route: f.receiver && f.receiver.generation !== f.receiverGeneration ? undefined : f.route };
        })];
        // Return reservations to their sources; already collected cargo resumes as pending delivery.
        for (const component of this.getComponent('WorldContinuity') ? [] : this.node.getComponentsInChildren('Hauler')) {
            const cargo = (component as Component & { snapshotCargo: () => { x: number; y: number; food: number; amount: number } }).snapshotCargo();
            for (let i = 0; i < cargo.amount; i++)flights.push({ x: cargo.x, y: cargo.y, food: cargo.food });
        }
        return { bushes, flights, refillElapsed: this.spawnElapsed, foragerFood: this.foragerFood };
    }
    public getOwnedBushes(owner: number): BlueberryBush[] { return Array.from(this.bushes).filter(b => b.discoveryOwner === owner); }
    public unregisterSource(source: FoodSource): void { this.sources?.delete(source); }
    public getAvailableSources(): FoodSource[] { return [...this.getAvailableBushes(), ...Array.from(this.sources).filter(s => isValid(s.node, true) && s.remaining > 0)]; }
    public setFoodSprite(node: Node, food: Food): void {
        const sprite = node.getComponent(Sprite); if (!sprite) return;
        this.spriteFood.set(sprite, food);
        const cached = this.foodFrames.get(food);
        if (cached) { sprite.spriteFrame = cached; return; }
        sprite.spriteFrame = null;
        originalFrame(foodFramePath(food)).then(frame => { if (isValid(node) && sprite.isValid && this.spriteFood.get(sprite) === food) sprite.spriteFrame = frame; }).catch(e => console.error(e));
    }
    private replenish(): void {
        if ((this.queenLevel !== WORLD.blueberry.refillQueenLevel && !this.upgrades?.upgradeState.genes.bountiful) || this.bushes.size >= WORLD.blueberry.refillBushLimit) return;
        const xs = BUSH_ZONE.map(p => p[0]), ys = BUSH_ZONE.map(p => p[1]);
        const left = Math.min(...xs), bottom = Math.min(...ys), width = Math.max(...xs) - left, height = Math.max(...ys) - bottom;
        const existing = Array.from(this.bushes);
        for (let attempt = 0; attempt < WORLD.blueberry.sampleAttempts; attempt++) {
            const x = left + Math.random() * width, y = bottom + Math.random() * height;
            if (insidePolygon(x, y, BUSH_ZONE) && !existing.some(b => Math.hypot(b.node.position.x - x, b.node.position.y - y) < WORLD.blueberry.minimumSpacing)) {
                this.spawn(x, y, this.upgrades?.upgradeState.genes.bountiful ? WORLD.forager.pileSize + this.upgrades.upgradeState.effects.pileSizeBonus : WORLD.blueberry.refillFruitCount); return;
            }
        }
    }
    private destination(): Vec3 {
        const mouth = (this as any)._cachedMouth || ((this as any)._cachedMouth = this.queen!.getChildByName('mouth') || this.queen!);
        return this.flightTransform().convertToNodeSpaceAR(mouth.worldPosition);
    }
    // Projectile nodes are children of the Projectiles layer, so trajectory points
    // must be expressed in their shared WorldRoot parent coordinates.
    private cachedFlightTransform: UITransform | null = null;
    private flightTransform(): UITransform {
        if (!this.cachedFlightTransform) this.cachedFlightTransform = this.flightRoot!.parent!.getComponent(UITransform)!;
        return this.cachedFlightTransform;
    }
    /** Offset a scene-world anchor in stable map-local units, then return world space. */
    public offsetMapPoint(worldPoint: Vec3, x: number, y: number, z = 0): Vec3 {
        const transform = this.flightTransform();
        const local = transform.convertToNodeSpaceAR(worldPoint);
        local.add3f(x, y, z);
        return transform.convertToWorldSpaceAR(local);
    }
    public launch(world: Vec3, food = Food.Blueberry, target?: () => Vec3, arrive?: () => void, seconds?: number, height?: number, saveAsFood = false, route?: SavedFlight["route"]): void {
        if (!this.flightRoot || !this.berryFrame) return;
        const start = this.flightTransform().convertToNodeSpaceAR(world);
        const end = target ? this.flightTransform().convertToNodeSpaceAR(target()) : this.destination();
        let n: Node | null = null;
        if (this.canRenderFood(food)) {
            n = this.freeFlights.pop() || null;
        if (!n) {
            n = new Node('Blueberry'); n.layer = this.node.layer; this.flightRoot.addChild(n);
            const transform = n.addComponent(UITransform), sprite = n.addComponent(Sprite);
            sprite.spriteFrame = this.berryFrame; sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            transform.setContentSize(WORLD.flight.size, WORLD.flight.size);
        }
        n.setPosition(start); n.active = true;
        this.setFoodSprite(n, food);
        this.incrementVisualCount(food);
    }
        const distance = Vec3.distance(start, end);
        // flying_food.gd applies the vertical-distance bonus and 0.94–1.06
        // variation in _ready, including when a caller supplies arc_height.
        const baseHeight = height ?? WORLD.flight.defaultHeight;
        const arcHeight = (baseHeight + Math.abs(start.y - end.y) * WORLD.flight.verticalHeightFactor)
            * (WORLD.flight.variationMin + Math.random() * (WORLD.flight.variationMax - WORLD.flight.variationMin));
        this.flights.push({ node: n, start, age: 0, food, target, arrive, saveAsFood, route, duration: seconds ?? (WORLD.flight.seconds + (distance > WORLD.flight.longDistanceThreshold ? (distance - WORLD.flight.distanceBaseline) * WORLD.flight.secondsPerUnit : 0)), height: arcHeight });
    }
    update(dt: number): void {
        if (!this.flightRoot || !this.upgrades || !this.queen || !isValid(this.queen)) return;
        const state = this.upgrades.upgradeState;
        if (this.tasteOptionsDirty || this.syncedTotalLarvae !== state.totalLarvae ||
            this.syncedQueenLevel !== this.queenLevel || this.syncedGenes !== state.genes) {
            this.syncTasteOptions(state);
        }
        this.restoreFlights(dt); this.window.advance(dt);
        this.tastes.advance(dt);
        this.spawnElapsed += dt;
        if (this.spawnElapsed >= WORLD.blueberry.refillInterval) { this.spawnElapsed %= WORLD.blueberry.refillInterval; this.replenish(); }
        const end = this.flights.length ? this.destination() : null;
        for (let i = this.flights.length - 1; i >= 0; i--) {
            const flight = this.flights[i]; let step = dt; if (flight.delay) { step = Math.max(0, dt - flight.delay); flight.delay = Math.max(0, flight.delay - dt); if (flight.delay) continue; if (flight.node) flight.node.active = true; } flight.age += step;
            const destination = flight.target ? this.flightTransform().convertToNodeSpaceAR(flight.target()) : end!;
            const progress = Math.max(0, Math.min(1, flight.age / flight.duration));
            if (flight.node) flight.node.setPosition(
                flight.start.x + (destination.x - flight.start.x) * progress,
                flight.start.y + (destination.y - flight.start.y) * progress + 4 * flight.height * progress * (1 - progress),
            );
            if (flight.age >= flight.duration) {
                if (flight.arrive) flight.arrive(); else this.consume(flight.food);
                if (flight.node) {
                    flight.node.active = false;
                if (this.freeFlights.length < WORLD.flight.poolLimit) this.freeFlights.push(flight.node);
                    else flight.node.destroy();
                    this.decrementVisualCount(flight.food);
                }
                this.flights.splice(i, 1);
            }
        }
        this.hudElapsed += dt; if (this.hudElapsed >= WORLD.feeding.hudRefreshSeconds) { this.hudElapsed = 0; this.syncHUD(); }
    }
    private syncTasteOptions(state = this.upgrades!.upgradeState): void {
        const options = this.tastes.options;
        const genes = state.genes;
        options.specialisations = genes;
        options.heatAffinity = state.level('queen_AffinityHeat') + state.level('mine_coal') * 3;
        options.coldFactor = state.level('mine_icicles') ? 2 : 1;
        options.cordonBleu = !!state.level('mine_salt');
        options.uncapEcstasy = !!state.level('mine_uncap');
        options.sororityBonus = genes.sorority ? state.totalLarvae * .1 : 0;
        options.undergroundBonus = state.level('mine_iron') * .3 + state.level('mine_coal') * .3 +
            state.level('mine_icicles') * .2 + state.level('mine_gold') * .4 + state.level('mine_salt') * .2 +
            state.level('mine_amber') * .2 + state.level('mine_mushrooms') * .2 + state.level('mine_clay') * .1 +
            state.level('mine_nacre') * .1 + state.level('mine_uncap') * .1 + state.level('mine_lead') * .2;
        options.coldAffinity = state.level('queen_AffinityCold') * .1;
        options.appleBonus = state.level('orchard_ApplesValue') * 3;
        options.meatValue = 50 + state.level('hunters_Tenderiser') * 10;
        options.queenLevel = this.queenLevel;
        options.handlers = state.level('mushrooms_SpawnHandler');
        options.extraHandlers = state.level('mushrooms_SpawnMycologist');
        options.verdantFactor = state.sporeEffects.verdant;
        options.clearFactor = state.sporeEffects.clear;
        this.syncedTotalLarvae = state.totalLarvae;
        this.syncedQueenLevel = this.queenLevel;
        this.syncedGenes = genes;
        this.tasteOptionsDirty = false;
    }
    private syncHUD(): void {
        this.hud?.setTasteModel(this.tastes,!!this.upgrades?.upgradeState.level('orchard_GoldenApples'));
        this.tastes.setDiet(this.window.contributions);
        this.hud?.setFeedingSnapshot(this.window.rate, this.window.contributions, this.window.amounts);
        const s = this.tastes.state;
        this.hud?.setStatus({
            addend: this.tastes.addend, multiplier: this.tastes.multiplier, heat: s.heat, cold: s.cold,
            frostburn: s.frostburn, sour: s.sourBonus, sourAddend: s.sourAddend, umami: s.umami,
            ecstasy: s.ecstasyBonus, shine: s.shineBonus, ecstasyStacks: s.ecstasy, shineStacks: s.shine
        });
    }

    public refreshPresentation(): void { this.syncHUD(); }
    public consume(food: Food): number {
        if (!this.upgrades) return 0;
        const now = performance.now();
        if (now - this.lastChompTime >= 50) {
            this.lastChompTime = now;
            playOriginalSound("chomp");
        }
        const result = this.tastes.eat(food), wallet = this.upgrades.upgradeState.resources;
        this.upgrades.setResources(wallet.nutrients + result.nutrition, wallet.larvae, wallet.greyMatter);
        this.window.feed(food, result.base, result.nutrition, result.contributions);
        this.spawnFloatingText(result.nutrition, food);
        this.node.emit('food-eaten', { foodType: food, amount: 1, nutrients: result.nutrition });
        if (food === Food.Blueberry) this.node.emit('blueberry-eaten', { foodType: food, amount: 1, nutrients: result.nutrition });
        const visual = this.queen?.getChildByName('queen_spr');
        if (visual && !this.queen?.getComponent('QueenLifecycle')) {
            if (this.fallbackEating) {
                this.fallbackPendingEat = true;
            } else {
                this.triggerFallbackEat(visual);
            }
        }
        return result.nutrition;
    }
    private triggerFallbackEat(visual: Node): void {
        this.fallbackEating = true;
        this.fallbackPendingEat = false;
        visual.setScale(1, 1, 1);
        tween(visual).to(WORLD.feeding.inSeconds, { scale: new Vec3(...WORLD.feeding.squash, 1) })
            .to(WORLD.feeding.outSeconds, { scale: new Vec3(1, 1, 1) })
            .call(() => {
                this.fallbackEating = false;
                if (this.fallbackPendingEat && isValid(visual, true)) {
                    this.triggerFallbackEat(visual);
                }
            }).start();
    }
    /** Keep prefab typography cached; the displayed size stays within 24–50. */
    private spawnFloatingText(value: number, foodId: number): void {
        if (!this.queen || !this.flightRoot || !Number.isFinite(value) || value <= 0) return;
        if (!preferences.floating) return;
        let node = this.freeFloatingLabels.pop();
        let reusingActive = false;
        if (!node && this.activeFloating >= FLOATING_TEXT.poolSize) {
            let matching: Node | undefined;
            let oldest: Node | undefined;
            for (const candidate of this.floatingLabels) {
                if (!candidate.active) continue;
                const entry = this.floatingValues.get(candidate)!;
                if (!oldest || entry.order < this.floatingValues.get(oldest)!.order) oldest = candidate;
                if (entry.foodId === foodId && (!matching || entry.order > this.floatingValues.get(matching)!.order)) matching = candidate;
            }
            // Keep every new eating event visible without allocating more labels.
            // Merge only the same food so the displayed color/value remain meaningful.
            node = matching || oldest;
            if (!node) return;
            if (matching) value += this.floatingValues.get(matching)!.value;
            reusingActive = true;
        }
        if (!node) {
            if (!this.floatingTextPrefab) return;
            node = instantiate(this.floatingTextPrefab);
            const setLayer = (child: Node) => { child.layer = this.node.layer; child.children.forEach(setLayer); };
            setLayer(node);
            this.flightRoot.addChild(node);
            this.floatingBaseScales.set(node, node.scale.clone());
            if (!node.getComponent(UIOpacity)) node.addComponent(UIOpacity);
            this.floatingLabels.push(node);
        }
        const label = node.getComponent(Label) || node.getComponentInChildren(Label);
        if (!label) { node.active = false; this.freeFloatingLabels.push(node); return; }
        Tween.stopAllByTarget(node);
        const opacity = node.getComponent(UIOpacity)!;
        Tween.stopAllByTarget(opacity);
        const entry = this.floatingValues.get(node) || { foodId, value, order: 0 };
        entry.foodId = foodId; entry.value = value; entry.order = ++this.floatingOrder;
        this.floatingValues.set(node, entry);
        const style = floatingTextStyle(value, foodId);
        label.string = style.text;
        const baseScale = this.floatingBaseScales.get(node)!;
        const sizeScale = style.fontSize / Math.max(1, label.fontSize);
        node.setScale(baseScale.x * sizeScale, baseScale.y * sizeScale, baseScale.z);
        const outline = FLOATING_TEXT.outlineColor;
        label.outlineColor = new Color(parseInt(outline.slice(0, 2), 16), parseInt(outline.slice(2, 4), 16), parseInt(outline.slice(4, 6), 16));
        const foodColor = new Color(
            parseInt(style.color.slice(0, 2), 16),
            parseInt(style.color.slice(2, 4), 16),
            parseInt(style.color.slice(4, 6), 16),
        );
        label.color = foodColor;
        const mouth = this.queen.getChildByName('mouth') || this.queen;
        const base = this.flightTransform().convertToNodeSpaceAR(mouth.worldPosition);
        const spread = style.spread;
        const startX = base.x + (Math.random() * 4 - 2) * spread;
        const startY = base.y + 150 + Math.random() * spread;
        const endX = startX + (Math.random() * 2 - 1) * spread;
        const endY = startY + FLOATING_TEXT.rise + 50 + Math.random() * Math.max(0, 2 * spread - 50);
        node.setPosition(startX, startY);
        const alpha = foodId === BLUEBERRY.id ? FLOATING_TEXT.blueberryAlpha : FLOATING_TEXT.alpha;
        opacity.opacity = Math.round(alpha * 255);
        node.active = true;
        if (!reusingActive) this.activeFloating++;
        node.setSiblingIndex(this.flightRoot.children.length - 1);
        tween(node).to(FLOATING_TEXT.duration, { position: new Vec3(endX, endY, 0) })
            .call(() => {
                node!.active = false; this.activeFloating--;
                this.freeFloatingLabels.push(node!);
            }).start();
        tween(opacity).to(FLOATING_TEXT.duration, { opacity: 0 }, { easing: 'expoIn' }).start();
    }
    onDestroy(): void {
        this.fallbackEating = false; this.fallbackPendingEat = false;
        for (const n of this.ownedBushes) if (isValid(n, true)) n.destroy();
        for (const flight of this.flights) if (flight.node && isValid(flight.node, true)) flight.node.destroy();
        for (const node of this.freeFlights) if (isValid(node, true)) node.destroy();
        for (const node of this.floatingLabels) { if (!isValid(node, true)) continue; Tween.stopAllByTarget(node); const opacity = node.getComponent(UIOpacity); if (opacity) Tween.stopAllByTarget(opacity); }
        this.ownedBushes.clear();
        this.flights = []; this.freeFlights = []; this.freeBushes = []; this.bushes.clear();
        this.visualFoodCounts.clear(); this.totalVisualCount = 0;
        this.floatingLabels = []; this.freeFloatingLabels = [];
        const visual = this.queen && isValid(this.queen, true) ? this.queen.getChildByName('queen_spr') : null; if (visual) Tween.stopAllByTarget(visual);
    }
}
