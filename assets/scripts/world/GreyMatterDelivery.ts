import { _decorator, Component, isValid, Node, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';
import { WorldLayers } from './WorldLayers';

const { ccclass } = _decorator;
export interface GreyMatterFlight {
    age: number; duration: number; startX: number; startY: number; endX: number; endY: number;
    curveHeight: number; amplitude: number; frequency: number; hudBend: number;
}
interface FlightVisual { state: GreyMatterFlight; node: Node; hud: boolean; }

/** grey_matter.gd / .tscn: slow drifting delivery, then a one-second HUD transfer. */
@ccclass('GreyMatterDelivery')
export class GreyMatterDelivery extends Component {
    private frame: SpriteFrame | null = null;
    private flights: FlightVisual[] = [];
    private canvas: Node | null = null;

    public initialize(saved: GreyMatterFlight[] = []): void {
        this.canvas = this.node.parent;
        this.frame = this.canvas?.getChildByPath('UI/GameHUD/Currencies/Resource2/Icon')?.getComponent(Sprite)?.spriteFrame || null;
        for (const state of saved) this.create({ ...state });
    }

    public launch(start: Vec3, chamber: Vec3): void {
        this.create({ age: 0, duration: 20 + Math.random() * 10,
            startX: start.x, startY: start.y, endX: chamber.x, endY: chamber.y + 70,
            curveHeight: 50 + Math.random() * 150, amplitude: 20 + Math.random() * 20,
            frequency: 2 + Math.random() * 2, hudBend: Math.random() * 200 - 100 });
    }

    public snapshot(): GreyMatterFlight[] { return this.flights.map(flight => ({ ...flight.state })); }

    private create(state: GreyMatterFlight): void {
        const node = new Node('GreyMatterFlight');
        node.layer = this.node.layer;
        const size = node.addComponent(UITransform);
        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = this.frame;
        sprite.sizeMode = Sprite.SizeMode.RAW;
        if (this.frame) size.setContentSize(this.frame.originalSize);
        const flight = { state, node, hud: state.age >= state.duration };
        (flight.hud ? this.canvas : this.getComponent(WorldLayers)?.projectiles)?.addChild(node);
        this.flights.push(flight);
        this.render(flight);
    }

    update(dt: number): void {
        if (!(this.getComponent('ColonySession') as Component & { isReady: boolean })?.isReady) return;
        for (const flight of [...this.flights]) {
            const state = flight.state;
            const nextAge = Math.min(state.duration + 1, state.age + dt);
            if (!flight.hud && nextAge >= state.duration) {
                // Arrival listeners persist this phase together with the chamber growth.
                state.age = state.duration;
                flight.hud = true;
                flight.node.setParent(this.canvas!);
                this.node.emit('grey-matter-arrived');
            }
            state.age = nextAge;
            this.render(flight);
            if (state.age >= state.duration + 1) {
                this.flights.splice(this.flights.indexOf(flight), 1);
                flight.node.destroy();
                // Remove first: the receiver saves the wallet and remaining flights together.
                this.node.emit('grey-matter-delivered');
            }
        }
    }

    private render(flight: FlightVisual): void {
        const s = flight.state, node = flight.node;
        if (!flight.hud) {
            const t = Math.min(1, s.age / s.duration);
            // Godot Y points downward. Keep the original curve sign after conversion.
            node.setPosition(s.startX + (s.endX - s.startX) * t + Math.sin(t * Math.PI * 2 * s.frequency) * s.amplitude,
                s.startY + (s.endY - s.startY) * t - 4 * s.curveHeight * t * (1 - t));
            const phase = s.age % 2;
            const scale = phase < 1 ? 1.5 - .3 * (1 - (1 - phase) ** 2) : 1.2 + .3 * (phase - 1) ** 2;
            node.setScale(scale, scale, 1);
            return;
        }
        const canvas = this.canvas?.getComponent(UITransform);
        const hud = this.canvas?.getChildByPath('UI/GameHUD');
        const source = hud?.getChildByPath('PortraitSummary/QueenTrack');
        const target = hud?.getChildByPath('Currencies/Resource2/Icon');
        if (!canvas || !target || !hud?.activeInHierarchy) { node.active = false; return; }
        node.active = true;
        const start = canvas.convertToNodeSpaceAR(source?.worldPosition || this.node.getComponent(UITransform)!.convertToWorldSpaceAR(new Vec3(s.endX, s.endY)));
        const end = canvas.convertToNodeSpaceAR(target.worldPosition);
        const t = 1 - Math.cos(Math.min(1, s.age - s.duration) * Math.PI / 2), u = 1 - t;
        const controlX = (start.x + end.x) / 2 + s.hudBend;
        const controlY = Math.min(start.y, end.y) - 200;
        node.setPosition(u * u * start.x + 2 * u * t * controlX + t * t * end.x,
            u * u * start.y + 2 * u * t * controlY + t * t * end.y);
        node.setScale(.5, .5, 1);
    }

    onDestroy(): void {
        for (const flight of this.flights) if (isValid(flight.node, true)) flight.node.destroy();
        this.flights = [];
    }
}
