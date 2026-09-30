import { playOriginalSound } from "../core/OriginalSound";
import { originalText } from '../config/OriginalText';
import { spriteEffect } from "./OriginalSpriteEffects";
import { isValid } from 'cc';
import { unlockAchievement } from '../core/PlayerMeta';
import { FACILITY_ANIMATIONS } from '../config/FacilityAnimations';
import { originalSample } from './OriginalAnimation';
import { _decorator, Component, Node, Vec3, Sprite, Color } from 'cc';
import { BlueberryFeeding } from './BlueberryFeeding';
import { ColonyPrefabs } from './ColonyPrefabs';
import { WorldLayers } from './WorldLayers';
import { FoodReceiver } from './FoodSource';
import { Food } from '../core/FeedingModel';
import { colonySave } from '../core/ColonyPersistence';
import { fishingPlan, BOAT_ORIGINS, BOAT_ZONE, MAX_FISHING_BOATS } from '../core/FishingRules';
import { insidePolygon } from './BlueberryRules';
import { FoodBin, bindFacility, choice, markChoice, disposeFacility, playScaleTrack } from './FacilitySupport';
import { layoutUpgradeChoiceRow } from '../ui/UpgradeChoiceSkin';
import { buildingReadout } from './BuildingReadout';
import { foodFramePath } from './OriginalArt';
import { BUILDING_POSITIONS } from '../config/MapConfig';
const {ccclass}=_decorator;
export interface BoatSnapshot {phase:'prepare'|'sail'|'unload'|'wait';age:number;duration:number;amount:number;bonus:number;sent:number;bonusSent:number;x:number;y:number;targetX:number;targetY:number;}
export interface FishingSnapshot {mode:number;bait:number;stock:number;boats:BoatSnapshot[];}
interface Boat {node:Node;origin:Vec3;data:BoatSnapshot;}
const DOCK_WOOB_TRACK={times:[0,.2,.4,.6],transitions:[.5,-2,1,1],values:[[1,1],[1.1,.9],[.9,1.1],[1,1]],interpolation:1};
@ccclass('Fishing')
export class Fishing extends Component {
    private feeding!:BlueberryFeeding;private building:Node|null=null;private stock:FoodBin|null=null;private boats:Boat[]=[];
    public mode=0;public bait=0;private incoming=0;private catchIncoming=0;private generation=0;private age=0;
    private receiver:FoodReceiver|null=null;private saved:FishingSnapshot|undefined;
    private get state(){return this.feeding.upgrades!.upgradeState;}
    private get baitUpgrade(){return ['','bait_fish','bait_tako','bait_pearls'][this.mode];}
    public get baitFood():Food {return this.mode===2?(this.state.genes.deep_sea_feast?Food.CandyApple:Food.Apple):(this.mode===1&&this.state.genes.deep_sea_feast?Food.Skewer:Food.Meat);}
    public get baitCapacity(){return Math.round(40/([1,.4,.2,1][this.mode]*(this.state.level('mine_lead')?2:1)))*this.boats.length*2;}
    public get capacity(){return Math.round(([0,800,40,20][this.mode]||0)*this.boats.length*1.5)*(this.mode===2?(this.state.level('fishing_bait_tako')?2:1)*(this.state.genes.deep_sea_feast?3:1):1);}
    start():void {
        this.feeding=this.getComponent(BlueberryFeeding)!;this.saved=colonySave.load()?.fishing;
        if(this.saved){this.mode=this.saved.mode;this.bait=this.saved.bait;}
        this.feeding.upgrades!.node.on('upgrade-purchased',this.changed,this);
        const content=this.feeding.upgrades!.optionHeader(12);
        ['沙丁鱼','章鱼','珍珠'].forEach((s,i)=>{const option=choice(content,'FishingMode'+(i+1),s,(i-1)*218,-30,205,()=>this.selectMode(i+1));this.feeding.upgrades!.bindOptionTip(option,()=>originalText('OPTION_FISHING_'+['SARDINES','TAKO','PEARLS'][i]));});
        this.feeding.upgrades!.customHeaders[12]=()=>{const visible:Node[]=[];for(let i=1;i<=3;i++){const n=content.getChildByName('FishingMode'+i)!;n.active=this.modeUnlocked(i);if(n.active)visible.push(n);}layoutUpgradeChoiceRow(visible);for(const n of visible)markChoice(n,Number(n.name.slice(-1))===this.mode);return visible.length?72:0;};
        this.changed();
    }
    public modeUnlocked(i:number):boolean {return !!this.state.level('fishing_'+(['','mode_net','mode_divers','mode_pearls'][i]))||(i===1&&!!this.state.level('fishing_firstboat'));}
    public selectMode(i:number):void {
        if(i===this.mode||!this.modeUnlocked(i))return;this.mode=i;this.generation++;if(this.receiver)this.receiver.generation=this.generation;this.bait=0;this.incoming=0;this.catchIncoming=0;
        if(this.stock){this.stock.reset();this.stock.foodType=i===1?Food.Sardine:i===2?Food.Tako:Food.Pearl;}
        this.boats.forEach((b,j)=>{b.node.setPosition(b.origin);b.data=this.empty(b.origin);b.data.age=-j*10;});this.feeding.upgrades!.refresh();
    }
    private empty(origin:Vec3):BoatSnapshot {return {phase:'prepare',age:0,duration:50,amount:0,bonus:0,sent:0,bonusSent:0,x:origin.x,y:origin.y,targetX:origin.x,targetY:origin.y};}
    private wobbleDock():void {const stall=this.building?.getChildByName('Stall');if(stall)playScaleTrack(stall,DOCK_WOOB_TRACK,.6);}
    private changed(e?:{id:string}):void {
        if(!this.building&&this.state.level('evolution_BuildingFishing')){
            this.building=this.getComponent(ColonyPrefabs)!.create('FishingDock',this.getComponent(WorldLayers)!.actors);this.building.setPosition(...BUILDING_POSITIONS.fishingDock);bindFacility(this.building,this.feeding.upgrades!,12,!this.saved,()=>this.wobbleDock());
            this.stock=new FoodBin(this.building,this.mode===2?Food.Tako:this.mode===3?Food.Pearl:Food.Sardine);this.stock.remaining=this.saved?.stock||0;this.feeding.registerSource(this.stock);
            this.receiver={node:this.building,generation:this.generation,accepts:f=>this.accepts(f),reserveInput:f=>{if(!this.accepts(f))return false;this.incoming++;return true;},receiveInput:f=>{if(f!==this.baitFood)return false;this.incoming=Math.max(0,this.incoming-1);this.bait++;this.wobbleDock();return true;},deliveryPosition:()=>this.feeding.offsetMapPoint(this.building!.worldPosition,0,130)};this.feeding.registerReceiver(this.receiver);
        }
        if(!this.building)return;
        const count=Math.min(MAX_FISHING_BOATS,this.state.level('fishing_firstboat')+this.state.level('fishing_extra_boat')+this.state.level('fishing_ghostship'));
        while(this.boats.length<count){const i=this.boats.length,n=this.getComponent(ColonyPrefabs)!.create('FishingBoat',this.getComponent(WorldLayers)!.actors,'Boat'+i),p=BOAT_ORIGINS[i],origin=new Vec3(BUILDING_POSITIONS.fishingDock[0]+p[0],BUILDING_POSITIONS.fishingDock[1]+p[1]);n.setPosition(origin);const data=this.saved?.boats[i]||this.empty(origin);if(!this.saved?.boats[i])data.age=-i*10;n.setPosition(data.x,data.y);this.boats.push({node:n,origin,data});}
        this.boats.forEach((b,i)=>{const ghost=this.state.level('fishing_ghostship')>0&&i===count-1;for(const s of b.node.getComponentsInChildren(Sprite))s.color=ghost?new Color(195,255,191,136):Color.WHITE;});
        if(e&&['fishing_firstboat','fishing_extra_boat','fishing_ghostship'].includes(e.id))playOriginalSound('new_boat');if(e?.id==='fishing_firstboat'&&this.mode===0)this.selectMode(1);this.feeding.upgrades!.refresh();
    }
    private accepts(food:Food){return this.mode>0&&food===this.baitFood&&!!this.state.level('fishing_'+this.baitUpgrade)&&this.bait+this.incoming<this.baitCapacity;}
    private destination():Vec3 {for(let i=0;i<500;i++){const x=-3129+Math.random()*3049,y=1275+Math.random()*610;if(insidePolygon(x,y,BOAT_ZONE))return new Vec3(x,y);}return new Vec3(-1700,1600);}
    private prepare(b:Boat):void {
        const p=fishingPlan(this.mode,this.state.level('fishing_'+this.baitUpgrade)?this.bait:0,!!this.state.level('mine_lead'),this.state.level('fishing_bait_upgrade_fish'),this.state.level('fishing_bait_upgrade_tako'),!!this.state.genes.deep_sea_feast);
        if(p.used){unlockAchievement('bait_fish');if(this.mode!==3&&this.state.genes.deep_sea_feast&&p.duration===10)unlockAchievement('max_feast');}playOriginalSound("set_sail");this.bait-=p.used;Object.assign(b.data,{phase:'sail',age:0,duration:p.duration,amount:p.amount,bonus:p.bonus,sent:0,bonusSent:0});const target=this.destination();b.data.targetX=target.x;b.data.targetY=target.y;
    }
    private unload(b:Boat,number:number,bonus:boolean):void {
        const food=this.stock!.foodType,gen=this.generation;
        for(let n=0;n<number;n++){
            if(bonus){this.feeding.deliver(this.feeding.offsetMapPoint(b.node.worldPosition,0,120),food,1,250);continue;}
            if(this.stock!.total+this.catchIncoming>=this.capacity)continue;
            this.catchIncoming++;this.feeding.launch(this.feeding.offsetMapPoint(b.node.worldPosition,0,120),food,()=>this.receiver!.deliveryPosition(),()=>{if(gen!==this.generation)return;this.catchIncoming--;this.stock!.remaining++;},.7,180);
        }
    }
    update(dt:number):void {
        if(!this.building||!this.mode)return;this.age+=dt;
        for(const b of this.boats){const d=b.data;d.age+=dt;
            if(d.phase==='prepare'&&d.age>=5)this.prepare(b);
            else if(d.phase==='sail'){
                const p=Math.min(1,d.age/d.duration),t=p<1/3?(1-Math.cos(p*3*Math.PI))/2:p<2/3?1:(1+Math.cos((p*3-2)*Math.PI))/2;
                b.node.setPosition(b.origin.x+(d.targetX-b.origin.x)*t,b.origin.y+(d.targetY-b.origin.y)*t);
                if(p>=1){d.phase='unload';d.age=0;}
            }else if(d.phase==='unload'){
                const fraction=Math.min(1,d.age/5),sent=Math.floor(d.amount*fraction),bonusSent=Math.floor(d.bonus*fraction);
                this.unload(b,sent-d.sent,false);this.unload(b,bonusSent-d.bonusSent,true);d.sent=sent;d.bonusSent=bonusSent;
                if(fraction===1){d.phase='prepare';d.age=0;}
            }
            const visual=b.node.getChildByName('Visuals')!;const p=.765+.035*Math.cos(this.age*Math.PI/3),body=visual.getChildByName('Body')!,line=visual.getChildByName('Line')!;
            body.setPosition(0,56+(p-.7)*280);const sprite=body.getComponent(Sprite)!;sprite.type=Sprite.Type.SIMPLE;spriteEffect(sprite,1,p,0,0);
            body.angle=d.phase==='sail'?-originalSample(FACILITY_ANIMATIONS.boat.rock.tracks[0],d.age,4)[0]*180/Math.PI:0;
            line.angle=d.phase==='sail'?-originalSample(FACILITY_ANIMATIONS.boat.rock.tracks[1],d.age,4)[0]*180/Math.PI:0;
            if(d.phase==='sail')visual.setScale((d.targetX-b.origin.x)*(d.age<d.duration*2/3?1:-1)>0?-1:1,1,1);
            d.x=b.node.position.x;d.y=b.node.position.y;
        }
        buildingReadout(this.building,'Stock',[{value:`${this.stock!.total} / ${this.capacity}`,icon:foodFramePath(this.stock!.foodType)}],0,265,440,25);
        buildingReadout(this.building,'Bait',[{value:`${this.bait} / ${this.baitCapacity}`,icon:foodFramePath(this.baitFood)}],0,222,400,23);
    }
    public snapshot():FishingSnapshot|undefined {return this.building?{mode:this.mode,bait:this.bait+this.incoming,stock:this.stock!.total+this.catchIncoming,boats:this.boats.map(b=>({...b.data}))}:this.saved;}
    onDestroy():void {this.feeding?.upgrades?.node.off('upgrade-purchased',this.changed,this);if(this.stock)this.feeding.unregisterSource(this.stock);if(this.receiver)this.feeding.unregisterReceiver(this.receiver);this.boats.forEach(b=>{if(isValid(b.node,true))b.node.destroy();});disposeFacility(this.building);}
}
