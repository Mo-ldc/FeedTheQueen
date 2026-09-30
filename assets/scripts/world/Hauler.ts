import { unlockAchievement } from '../core/PlayerMeta';
import { ForagerPopulation } from './ForagerPopulation';
import { WORLD } from '../config/WorldConfig';
import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Vec3, isValid } from 'cc';
import { FoodSource, FoodRelay } from './FoodSource';
import { Food } from '../core/FeedingModel';
import { BlueberryFeeding } from './BlueberryFeeding';

const { ccclass, property } = _decorator;
type Task = 'idle' | 'seek' | 'carry' | 'throw';
const PERSPECTIVE_Y = .82;
const BODY_HEIGHT = 33;
const FRUIT_POSITIONS: ReadonlyArray<readonly [number, number]> = [
    [0, 60], [-21, 61], [21.139109, 60.711952], [-16, 79],
    [16, 78], [-1, 83], [-12, 98], [11, 97],
];

/** Original hauler task states and base_wobble_animation.res keyframes. */
@ccclass('Hauler')
export class Hauler extends Component {
    @property(SpriteFrame) idleFrame: SpriteFrame | null = null;
    @property(SpriteFrame) idleFrame2: SpriteFrame | null = null;
    @property(SpriteFrame) idleFrame3: SpriteFrame | null = null;
    @property(SpriteFrame) idleFrame4: SpriteFrame | null = null;
    @property(SpriteFrame) idleFrame5: SpriteFrame | null = null;
    @property(SpriteFrame) walkFrame: SpriteFrame | null = null;
    @property(SpriteFrame) walkFrame2: SpriteFrame | null = null;
    @property(SpriteFrame) walkFrame3: SpriteFrame | null = null;
    @property(SpriteFrame) walkFrame4: SpriteFrame | null = null;
    @property(SpriteFrame) walkFrame5: SpriteFrame | null = null;
    @property(SpriteFrame) carryFrame1: SpriteFrame | null = null;
    @property(SpriteFrame) carryFrame2: SpriteFrame | null = null;
    @property(SpriteFrame) carryFrame3: SpriteFrame | null = null;
    @property(SpriteFrame) throwFrame: SpriteFrame | null = null;
    @property(SpriteFrame) blueberryFrame: SpriteFrame | null = null;

    private feeding: BlueberryFeeding | null = null;
    private relay:FoodRelay|null=null;
    private queen: Node | null = null;
    private visual: Node | null = null;
    private shadow: Node | null = null;
    private animated: Node | null = null;
    private body: Sprite | null = null;
    private fruit: Node[] = [];
    private target: FoodSource | null = null;
    private cargoType=Food.Blueberry;
    private targetGeneration = 0;
    private task: Task = 'idle';
    private reserved = 0;
    private cargo = 0;
    private speed = WORLD.hauler.speed;
    private speedVariation = .98 + Math.random() * .04;
    private capacity = 1;
    private priorityMode = 0;
    private seekLeft = 0;
    private animationTime = 0;
    private animationElapsed = 0;
    // Source frames face upward; continuously aim the head at the destination.
    private facingAngle = -90;
    private throwLeft = 0;
    private offset = new Vec3();
    private retiring = false;
    private hotLeft=0;
    private foragerPop: ForagerPopulation | null = null;

    public initialize(feeding: BlueberryFeeding, queen: Node): void {
        this.feeding = feeding;
        this.queen = queen;
        this.foragerPop = feeding.node.getComponent(ForagerPopulation);
        this.visual = this.node.getChildByName('Visual');
        this.shadow = this.visual?.getChildByName('Shadow') || null;
        const bodyNode = this.visual?.getChildByName('Body');
        this.body = bodyNode?.getComponent(Sprite) || null;
        if (!this.visual || !bodyNode || !this.body) return;

        // The replacement frames are drawn from directly above. Compress the
        // world vertical axis so they sit in the game's oblique view.
        this.visual.setScale(1, PERSPECTIVE_Y, 1);

        this.animated = new Node('HaulerVisual');
        this.animated.layer = this.node.layer;
        this.visual.addChild(this.animated);
        bodyNode.setParent(this.animated, false);
        const foods = new Node('Foods');
        foods.layer = this.node.layer;
        this.animated.addChild(foods);
        foods.setSiblingIndex(0); // Godot: food sprites are behind the ant body.
        for (const [x, y] of FRUIT_POSITIONS) {
            const food = new Node('Food');
            food.layer = this.node.layer;
            foods.addChild(food);
            food.setPosition(x, y - BODY_HEIGHT);
            food.setScale(1.0191401, .98158824);
            food.addComponent(UITransform).setContentSize(36, 36);
            food.addComponent(Sprite).spriteFrame = this.blueberryFrame;
            food.active = false;
            this.fruit.push(food);
        }
        this.applyAnimation();
    }

    public configure(speed: number, capacity: number, priorityMode: number): void {
        this.speed = speed * this.speedVariation;
        this.capacity = Math.max(1, Math.floor(capacity));
        this.priorityMode = priorityMode;
    }

    update(dt: number): void {
        if((this.node.parent?.parent?.getComponent("WorldContinuity") as Component&{blocks(node:Node):boolean})?.blocks(this.node))return;
        if (this.retiring || !this.feeding || !this.queen) return;
        const spores=this.feeding.upgrades!.upgradeState.sporeEffects;
        this.hotLeft=Math.max(0,this.hotLeft-dt);
        this.animationTime += dt;
        if (this.task === 'idle') {
            this.seekLeft -= dt;
            if (this.seekLeft <= 0) this.assignTask();
        } else if (this.task === 'seek') {
            if (!this.target || !isValid(this.target.node, true) || !this.target.node.activeInHierarchy ||
                this.target.generation !== this.targetGeneration || this.target.reserved <= 0) {
                this.clearTask();
            } else if (this.moveToward(this.target.node.position, WORLD.hauler.pickupRange*(1+spores.focus/10), dt)) {
                this.cargoType=this.target.foodType;
                if(this.feeding.upgrades!.upgradeState.level('haulers_HotPotato')&&[5,9,19].includes(this.cargoType))this.hotLeft=30;
                this.cargo = this.target.collectReservedForHauler(this.reserved);
                this.reserved = 0;
                this.target = null;
                this.updateFruit();
                if (this.cargo > 0) {this.relay=this.feeding.receiverFor(this.cargoType)?null:this.feeding.claimRelay(this.node.position);this.setTask('carry');}
                else this.clearTask();
            }
        } else if (this.task === 'carry') {
            if(this.relay&&!isValid(this.relay.node,true))this.relay=null;
            if (this.moveToward(this.feeding.receiverFor(this.cargoType)?.node.position||this.relay?.node.position||this.queen.position, WORLD.hauler.deliveryRange*(1+spores.focus)+(this.feeding.upgrades!.upgradeState.genes.mimicry&&this.feeding.upgrades!.upgradeState.level('throwers_SpawnThrower')>this.feeding.upgrades!.upgradeState.level(this.node.name.startsWith('East')?'gemini_SpawnGemini':'haulers_SpawnHauler')?300:0), dt)) {
                this.setTask('throw');
                this.throwLeft = 0;
            }
        } else {
            this.throwLeft -= dt;
            if (this.throwLeft <= 0 && this.cargo > 0) {
                const launchPosition = this.fruit[Math.min(this.cargo - 1, this.fruit.length - 1)]?.worldPosition.clone()
                    || this.feeding.offsetMapPoint(this.node.worldPosition, 0, 70);
                if(this.relay&&isValid(this.relay.node,true))this.feeding.launchToRelay(launchPosition,this.cargoType,this.relay);
                else this.feeding.throwByHauler(launchPosition,this.cargoType);
                this.cargo--;
                this.updateFruit();
                this.throwLeft += WORLD.hauler.throwInterval/(1+spores.euphoria+(this.feeding.upgrades!.upgradeState.genes.up?this.feeding.upgrades!.upgradeState.activeTunnellers*.2:0))/(this.hotLeft>0?3:1);
            }
            if (this.cargo === 0 && this.throwLeft <= 0) this.clearTask();
        }
        this.animationElapsed += dt;
        if (this.animationElapsed >= 1 / 20) {
            this.animationElapsed %= 1 / 20;
            this.applyAnimation();
        }
    }

    private assignTask(): void {
        const choices = this.feeding!.getAvailableSources();
        while (choices.length) {
            const target = this.chooseTarget(choices);
            const reserved = target.reserveForHauler(this.capacity);
            if (reserved > 0) {
                this.target = target;
                this.targetGeneration = target.generation;
                this.reserved = reserved;
                this.setTask('seek');
                return;
            }
            choices.splice(choices.indexOf(target), 1);
        }
        this.seekLeft = WORLD.hauler.seekInterval;
    }

    private chooseTarget(bushes: FoodSource[]): FoodSource {
        if (this.priorityMode === 0) return bushes[Math.floor(Math.random() * bushes.length)];
        if (this.priorityMode === 2) return bushes.reduce((largest, bush) =>
            bush.remaining > largest.remaining ? bush : largest);
        if (this.priorityMode === 3) return bushes.reduce((smallest, bush) =>
            bush.remaining < smallest.remaining ? bush : smallest);
        return bushes.reduce((nearest, bush) =>
            Vec3.squaredDistance(bush.node.position, this.node.position) <
            Vec3.squaredDistance(nearest.node.position, this.node.position) ? bush : nearest);
    }

    private setTask(task: Task): void {
        this.task = task;
        this.animationTime = 0;
        this.offset.set((Math.random() - .5) * 100, (Math.random() - .5) * 100, 0);
    }
    private clearTask(): void {
        this.relay=null;
        if (this.target && isValid(this.target.node, true) && this.target.generation === this.targetGeneration && this.reserved > 0)
            this.target.releaseReservation(this.reserved);
        this.target = null;
        this.targetGeneration = 0;
        this.reserved = 0;
        this.cargo = 0;
        this.updateFruit();
        this.setTask('idle');
        this.seekLeft = 0;
    }

    private moveToward(destination: Vec3, range: number, dt: number): boolean {
        const from = this.node.position;
        const dx = destination.x + this.offset.x - from.x;
        const dy = destination.y + this.offset.y - from.y;
        const distance = Math.hypot(dx, dy);
        // Cocos stores node positions as float32. Clamping exactly to the
        // pickup boundary can round back outside it forever at distant maps.
        if (distance <= range + .5) return true;
        const s=this.feeding!.upgrades!.upgradeState,g=s.genes;
        const idle = g.encouragements ? (this.foragerPop || (this.foragerPop = this.feeding?.node.getComponent(ForagerPopulation) || null))?.idleCount || 0 : 0;
        let speed=this.speed+(g.entropy&&this.priorityMode===0?70:0)+(idle>=3?40:0)+(g.high?s.level('mushrooms_SpawnMycologist')+s.level('mushrooms_SpawnHandler'):0)+(this.hotLeft>0?50:0);
        if(s.level('haulers_Sprint')&&this.cargo>=1&&this.cargo<=3)speed*=4;
        if(speed>=1000)unlockAchievement('hauler_ms');if(this.task==='carry'&&range>=1000)unlockAchievement('hauler_tr');
        const travel = Math.min(speed * dt, distance);
        const movedX = dx / distance * travel;
        const movedY = dy / distance * travel;
        this.node.setPosition(from.x + movedX, from.y + movedY, 0);
        this.updateFacingFromMovement(movedX, movedY, dt);
        return false;
    }

    private updateFacingFromMovement(dx: number, dy: number, dt = 0): void {
        if (Math.hypot(dx, dy) < .01) return;
        // Undo vertical foreshortening so the visible head follows the exact
        // movement vector, including angles between the old eight sectors.
        const projectedAngle = Math.atan2(-dx, dy / PERSPECTIVE_Y) * 180 / Math.PI;
        const target = ((projectedAngle + 180) % 360 + 360) % 360 - 180;
        const difference = ((target - this.facingAngle + 180) % 360 + 360) % 360 - 180;
        const step = 720 * Math.max(0, dt);
        this.facingAngle += Math.max(-step, Math.min(step, difference));
        this.facingAngle = ((this.facingAngle + 180) % 360 + 360) % 360 - 180;
    }

    private updateFruit(): void {
        this.fruit.forEach((food, index) => {food.active=index<this.cargo;if(food.active)this.feeding?.setFoodSprite(food,this.cargoType);});
    }

    /** Rebuild presentation after old saves restore mirrored and offset poses. */
    public restorePresentation(): void {
        this.fruit.forEach((food, index) => {
            const [x, y] = FRUIT_POSITIONS[index];
            food.setPosition(x, y - BODY_HEIGHT);
        });
        this.applyAnimation();
    }

    private applyAnimation(): void {
        if (!this.body || !this.animated) return;
        const cycle = this.animationTime * this.speed * WORLD.hauler.animationSpeedPerUnit;
        const phase = cycle - Math.floor(cycle);
        let frame: SpriteFrame | null = this.idleFrame;
        const height = 75;
        let scaleX = 1, scaleY = 1, posY = 0, angle = this.facingAngle;
        if (this.task === 'idle') {
            frame = [this.idleFrame, this.idleFrame2, this.idleFrame3, this.idleFrame4, this.idleFrame5][Math.floor(this.animationTime * 18) % 5] || this.idleFrame;
            const p = this.animationTime % 1;
            const half = p < .5 ? p * 2 : (1 - p) * 2;
            const squeeze = half * half * (3 - 2 * half);
            scaleX = 1 - .025 * squeeze;
            scaleY = 1 + .025 * squeeze;
        } else if (this.task === 'throw') {
            frame = this.throwFrame || this.idleFrame3;
            const throwTime = (this.animationTime * (.4 / WORLD.hauler.throwInterval)) % .5;
            if (throwTime < .15) {
                scaleX = 1 - throwTime / .15 * .06;
                scaleY = 1 + throwTime / .15 * .04;
            } else if (throwTime < .4) {
                const p = (throwTime - .15) / .25;
                scaleX = .94 + p * .12;
                scaleY = 1.04 - p * .14;
                posY = p * 3;
            } else { scaleX = 1.06; scaleY = .9; posY = 3; }
        } else {
            const step = Math.floor(phase * 5);
            frame = [this.walkFrame, this.walkFrame2, this.walkFrame3, this.walkFrame4, this.walkFrame5][step];
        }
        if (frame) this.body.spriteFrame = frame;
        this.body.sizeMode = Sprite.SizeMode.CUSTOM;
        this.body.trim = false;
        // Legacy saves can restore Visual.scale.x=-1 after initialize().
        // Rotation now owns facing; an inherited mirror would reverse it.
        this.visual!.setScale(1, PERSPECTIVE_Y, 1);
        this.visual!.angle = 0;
        this.visual!.setPosition(0, 0, 0);
        const original = frame?.originalSize;
        const width = original ? height * original.width / original.height : 62.5;
        this.body.node.getComponent(UITransform)!.setContentSize(width, height);
        this.body.node.setScale(1, 1, 1);
        this.body.node.angle = 0;
        // Rotate around the body center. Elevation belongs outside the turn,
        // otherwise a reversal swings the sprite 60+ units across the ground.
        this.body.node.setPosition(0, 0);
        this.animated.setPosition(0, BODY_HEIGHT + posY);
        this.animated.setScale(scaleX, scaleY, 1);
        this.animated.angle = angle;
        // Shadow and turn pivot share Visual as their parent. Keep their
        // centers together, including the small lift during a throw.
        this.shadow?.setPosition(this.animated.position);
    }

    public retire(): void { this.clearTask(); this.retiring = true; this.node.destroy(); }
    public snapshotCargo(){return {x:this.node.position.x,y:this.node.position.y,food:this.cargoType,amount:this.cargo};}
}
