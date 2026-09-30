import { Sprite, UIOpacity, Color, UITransform } from "cc";
import { originalText } from '../config/OriginalText';
import { PRESENTATION } from "../config/PresentationConfig";
import { OriginalParticles } from "./OriginalParticles";
import { spriteEffect } from "./OriginalSpriteEffects";
import { unlockAchievement } from "../core/PlayerMeta";
import { FACILITY_ANIMATIONS } from '../config/FacilityAnimations';
import { originalSample } from './OriginalAnimation';
import { _decorator, Component, Node, Vec3, isValid, tween } from 'cc';
import { BlueberryFeeding } from './BlueberryFeeding';
import { ColonyPrefabs } from './ColonyPrefabs';
import { WorldLayers } from './WorldLayers';
import { Hauler } from './Hauler';
import { FoodSource } from './FoodSource';
import { bindFacility, choice, markChoice, disposeFacility, playScaleTrack } from './FacilitySupport';
import { layoutUpgradeChoiceRow } from '../ui/UpgradeChoiceSkin';
import { colonySave } from '../core/ColonyPersistence';
import { TUNNELLER_TAB_INDEX } from '../config/UpgradeConfig';
import { buildingReadout } from './BuildingReadout';
import { BUILDING_POSITIONS } from '../config/MapConfig';
import { reserveWorldSpawn } from './WorldSpawnQueue';
const {ccclass}=_decorator;
export interface AdvancedSnapshot {active:number;known:number;clock:number;retryClock?:number;hatches:{x:number;y:number;age:number;counted:boolean}[];tunnels:{source:{name:string;x:number;y:number;food:number};entry:number[];exit:number[];age:number;clock:number;transported:number;batchRemaining?:number;batchGroup?:number;batchOrigin?:number[];retry?:number;closingAt?:number|null}[];}
interface Hole {node:Node;worm:Node;}
interface Tunnel {entry:Hole;exit:Hole;source:FoodSource;generation:number;age:number;clock:number;transported:number;batchRemaining:number;batchGroup:number;batchOrigin:Vec3;retry:number;closingAt:number|null;}
@ccclass('AdvancedFacilities')
export class AdvancedFacilities extends Component {
    private feeding!:BlueberryFeeding;private buildings:Node[]=[];private workers:Hauler[]=[];private tunnels:Tunnel[]=[];private clock=0;private retryClock=0;private hatches:{hole:Hole;age:number;counted:boolean}[]=[];private known=0;private saved:AdvancedSnapshot|undefined;
    private get state(){return this.feeding.upgrades!.upgradeState;}
    private get prefabs(){return this.getComponent(ColonyPrefabs)!;}
    private get actors(){return this.getComponent(WorldLayers)!.actors;}
    private restoredBuildings:Record<string,number>={};
    start():void {
        const saved=colonySave.load();this.restoredBuildings=saved?.upgrades.levels||{};
        this.feeding=this.getComponent(BlueberryFeeding)!;this.saved=saved?.advanced;this.known=this.saved?.known??(saved?.upgrades.levels.tunnellers_tunneller||0);this.state.activeTunnellers=this.saved?.active??this.known;for(const h of this.saved?.hatches||[])this.hatches.push({hole:this.createHole(new Vec3(h.x,h.y),"HatchingHole"),age:h.age,counted:h.counted});this.clock=this.saved?.clock||0;this.retryClock=this.saved?.retryClock||0;this.feeding.upgrades!.node.on('upgrade-purchased',this.synchronize,this);this.feeding.upgrades!.node.on('genes-changed',this.synchronize,this);
        const content=this.feeding.upgrades!.optionHeader(9);
        ['随机','最近','最大','最小'].forEach((s,i)=>choice(content,'EastPriority'+i,s,(i-1.5)*163,-30,155,()=>{if(!this.priorityUnlocked(i))return;this.state.eastPriority=i;this.synchronize();this.feeding.upgrades!.refresh();}));
        for(let i=0;i<4;i++)this.feeding.upgrades!.bindOptionTip(content.getChildByName('EastPriority'+i)!,()=>originalText('OPTION_CARRIER_'+['RANDOM','CLOSEST','LARGEST','SMALLEST'][i]+'_DESCRIPTION'));
        this.feeding.upgrades!.customHeaders[9]=()=>{const visible:Node[]=[];for(let i=0;i<4;i++){const n=content.getChildByName('EastPriority'+i)!;n.active=this.priorityUnlocked(i);if(n.active)visible.push(n);}layoutUpgradeChoiceRow(visible);for(let i=0;i<visible.length;i++)markChoice(visible[i],Number(visible[i].name.slice(-1))===this.state.eastPriority);return visible.length?72:0;};
        const tunnels=this.feeding.upgrades!.optionHeader(TUNNELLER_TAB_INDEX);
        ['随机','最近','最大','最小'].forEach((s,i)=>choice(tunnels,'TunnelPriority'+i,s,(i-1.5)*163,-30,155,()=>{if(!this.priorityUnlocked(i))return;this.state.tunnelPriority=i;this.feeding.upgrades!.refresh();}));
        for(let i=0;i<4;i++)this.feeding.upgrades!.bindOptionTip(tunnels.getChildByName('TunnelPriority'+i)!,()=>originalText('OPTION_CARRIER_'+['RANDOM','CLOSEST','LARGEST','SMALLEST'][i]+'_DESCRIPTION'));
        this.feeding.upgrades!.customHeaders[TUNNELLER_TAB_INDEX]=()=>{const on=!!this.state.level('evolution_BuildingTunnellers'),visible:Node[]=[];for(let i=0;i<4;i++){const n=tunnels.getChildByName('TunnelPriority'+i)!;n.active=on&&this.priorityUnlocked(i);if(n.active)visible.push(n);}layoutUpgradeChoiceRow(visible);for(const n of visible)markChoice(n,Number(n.name.slice(-1))===this.state.tunnelPriority);return visible.length?72:0;};this.synchronize();
    }
    private priorityUnlocked(i:number):boolean {return i===0||!!this.state.level(['','haulers_CarrierClosest','throwers_CarrierBiggest','haulers_CarrierSmallest'][i]);}
    private synchronize():void {
        const buildingEntries:[string,string,readonly [number,number],number][]=[['Gemini','EastHaulerApartment',BUILDING_POSITIONS.gemini,9],['Mine','Mine',BUILDING_POSITIONS.mine,11],['Tunnellers','TunnellerDen',BUILDING_POSITIONS.tunnellers,TUNNELLER_TAB_INDEX]];
        for(const [id,name,position,page]of buildingEntries){
            if(this.state.level('evolution_Building'+id)&&!this.buildings.some(n=>n.name===name)){const n=this.prefabs.create(name,this.actors);n.setPosition(position[0],position[1]);bindFacility(n,this.feeding.upgrades!,page,!this.restoredBuildings['evolution_Building'+id],name==='TunnellerDen'?()=>this.animateDen(n):undefined);this.buildings.push(n);}
        }
        if(this.state.level('evolution_BuildingGemini')){
            while(this.workers.length<this.state.level('gemini_SpawnGemini')){if(!reserveWorldSpawn(this,()=>this.synchronize()))break;const n=this.prefabs.create('Hauler',this.actors,'EastHauler'+this.workers.length);n.setPosition(...BUILDING_POSITIONS.gemini);const w=n.getComponent(Hauler)!;w.initialize(this.feeding,this.feeding.queen!);this.workers.push(w);}
            while(this.workers.length>this.state.level('gemini_SpawnGemini'))this.workers.pop()!.retire();
            for(const w of this.workers)w.configure(200+20*(this.state.level('gemini_GeminiSpeed')-this.state.level('gemini_GeminiCapacityHerculean')),1+this.state.level('gemini_GeminiCapacity')+this.state.level('gemini_GeminiCapacityHerculean'),this.state.eastPriority);
        }
        while(this.known<this.state.level("tunnellers_tunneller")){if(!reserveWorldSpawn(this,()=>this.synchronize()))break;this.known++;const hole=this.createHole(new Vec3(BUILDING_POSITIONS.tunnellers[0]+Math.random()*500-250,BUILDING_POSITIONS.tunnellers[1]+150),"HatchingHole");this.hatches.push({hole,age:0,counted:false});this.startDirt(hole.node);}
        this.clock=Math.min(this.clock,30/Math.max(1,this.state.activeTunnellers));
    }
    private animateDen(n:Node):void {const visual=n.getChildByName('Building');if(visual)playScaleTrack(visual,{times:[0,.2,.4,.6],transitions:[.5,-2,1,1],values:[[1,1],[1.1,.9],[.9,1.1],[1,1]],interpolation:1},.6);}
    private createHole(position:Vec3,name='TunnelEntrance'):Hole {
        const node=this.prefabs.create('TunnelEntrance',this.actors,name);node.setPosition(position);node.addComponent(UIOpacity);
        const top=node.getChildByName('Top')!,bottom=node.getChildByName('Bottom')!;
        // Original SpriteTunnel uses an image offset of (0,-6) in Godot coordinates.
        top.setPosition(0,65.5);bottom.setPosition(0,66.5);
        for(const part of [top,bottom]){const sprite=part.getComponent(Sprite)!;sprite.sizeMode=Sprite.SizeMode.RAW;sprite.trim=false;}
        const hint=new Node('Hint');hint.layer=node.layer;node.addChild(hint);hint.setPosition(0,-13);hint.setScale(.9,-.2,1);
        const hintSprite=hint.addComponent(Sprite),bottomSprite=bottom.getComponent(Sprite)!;
        hintSprite.sizeMode=Sprite.SizeMode.RAW;hintSprite.trim=false;hintSprite.spriteFrame=bottomSprite.spriteFrame;hintSprite.color=new Color(46,19,0,255);
        const worm=this.prefabs.create('Tunneller',node,'Tunneller');
        // The prefab stores the three original sprites as siblings. These offsets
        // reproduce the source Sprite2D offsets without depending on trimmed frames.
        hint.setSiblingIndex(0);top.setSiblingIndex(1);bottom.setSiblingIndex(2);worm.setSiblingIndex(3);
        for(const sprite of worm.getComponentsInChildren(Sprite)){sprite.sizeMode=Sprite.SizeMode.RAW;sprite.trim=false;}
        this.showHole({node,worm},0,1);
        return {node,worm};
    }
    private startDirt(node:Node):void {const dirt=PRESENTATION.tunnel.particles[0];OriginalParticles.burst(this.node,node.position,dirt,undefined,Math.ceil(dirt.amount/dirt.lifetime*2));}
    private showHole(hole:Hole,localAge:number,fade:number):void {
        const {node,worm}=hole,open=localAge>=2;
        node.active=localAge>=0;node.getChildByName('Top')!.active=open;node.getChildByName('Bottom')!.active=open;node.getChildByName('Hint')!.active=!open;
        const rise=Math.max(0,Math.min(1,(localAge-2)/.8));
        const elastic=rise===0?0:rise===1?1:Math.pow(2,-10*rise)*Math.sin((rise*10-.75)*2*Math.PI/3)+1;
        const fall=Math.max(0,Math.min(1,(localAge-3.2)/.4));
        const back=2.70158*fall*fall*fall-1.70158*fall*fall;
        const visibility=localAge<3.2?elastic:1-back;
        worm.active=open&&localAge<3.6&&fade>0;
        worm.getChildByName('Body')!.setPosition(-2.333,165*visibility-95);
        worm.getChildByName('Tail')!.setPosition(-2.5,165*visibility-106);
        const segment=originalSample(FACILITY_ANIMATIONS.tunnel.Loop.tracks[1],Math.max(0,localAge-2),1);
        worm.getChildByName('Segment')!.setPosition(segment[0]-7.5,165*visibility-segment[1]+63);
        for(const sprite of worm.getComponentsInChildren(Sprite))spriteEffect(sprite,1,visibility-.1,0,0);
        const scale=originalSample(FACILITY_ANIMATIONS.tunnel.Loop.tracks[0],Math.max(0,localAge-2),1);worm.setScale(scale[0],scale[1],1);
        node.setScale(1,fade,1);node.getComponent(UIOpacity)!.opacity=Math.round(255*fade);
    }
    private makeTunnel(saved?:AdvancedSnapshot["tunnels"][number]):boolean {
        const found=saved?this.feeding.findSource(saved.source):null;const choices=saved?(found?[found]:[]):this.feeding.getAvailableSources().filter(s=>!this.tunnels.some(t=>t.source===s&&t.closingAt===null));if(!choices.length)return false;
        const mode=this.state.tunnelPriority,source=mode===0?choices[Math.floor(Math.random()*choices.length)]:choices.reduce((a,b)=>mode===1?(Vec3.squaredDistance(a.node.position,this.feeding.queen!.position)<Vec3.squaredDistance(b.node.position,this.feeding.queen!.position)?a:b):mode===2?(a.remaining>b.remaining?a:b):(a.remaining<b.remaining?a:b)),angle=Math.random()*Math.PI*2,radius=250+Math.random()*100;
        const entryPosition=saved?new Vec3(saved.entry[0],saved.entry[1]):source.node.position.clone().add3f(Math.cos(angle)*radius,Math.sin(angle)*radius,0);
        const dest=this.feeding.receiverFor(source.foodType)?.node||this.feeding.queen!,exitAngle=Math.random()*Math.PI*2,exitRadius=250+Math.random()*100;
        const exitPosition=saved?new Vec3(saved.exit[0],saved.exit[1]):dest.position.clone().add3f(Math.cos(exitAngle)*exitRadius,Math.sin(exitAngle)*exitRadius,0);
        const entry=this.createHole(entryPosition),exit=this.createHole(exitPosition);
        this.showHole(entry,saved?.age||0,1);
        this.showHole(exit,(saved?.age||0)-4,1);
        if(!saved)this.startDirt(entry.node);
        this.tunnels.push({entry,exit,source,generation:source.generation,age:saved?.age||0,clock:saved?.clock||0,transported:saved?.transported||0,batchRemaining:saved?.batchRemaining||0,batchGroup:saved?.batchGroup||1,batchOrigin:saved?.batchOrigin?new Vec3(saved.batchOrigin[0],saved.batchOrigin[1]):source.node.worldPosition.clone(),retry:saved?.retry||0,closingAt:saved?.closingAt??null});
        return true;
    }
    public snapshot():AdvancedSnapshot {
        const count=this.state.level('tunnellers_tunneller');
        return {active:Math.min(count,this.state.activeTunnellers),known:Math.min(count,this.known),clock:this.clock,retryClock:this.retryClock,
            hatches:count?this.hatches.map(h=>({x:h.hole.node.position.x,y:h.hole.node.position.y,age:h.age,counted:h.counted})):[],
            tunnels:count?[...(this.saved?.tunnels||[]),...this.tunnels.filter(t=>isValid(t.source.node,true)).map(t=>({
                source:{name:t.source.node.name,x:t.source.node.position.x,y:t.source.node.position.y,food:t.source.foodType},
                entry:[t.entry.node.position.x,t.entry.node.position.y],exit:[t.exit.node.position.x,t.exit.node.position.y],
                age:t.age,clock:t.clock,transported:t.transported,batchRemaining:t.batchRemaining,batchGroup:t.batchGroup,batchOrigin:[t.batchOrigin.x,t.batchOrigin.y],retry:t.retry,closingAt:t.closingAt
            }))]:[]};
    }
    private updateTransport(t:Tunnel,dt:number):void {
        if(!t.batchRemaining){
            if(t.age>=27||t.transported>=2500||!isValid(t.source.node,true)||t.source.generation!==t.generation){t.closingAt=t.age+.5;return;}
            if(t.retry>0){t.retry=Math.max(0,t.retry-dt);return;}
            const reserved=t.source.reserveForHauler(Math.min(200,2500-t.transported));
            const amount=t.source.collectReservedForHauler(reserved);
            if(!amount){t.retry=1;return;}
            t.batchRemaining=amount;t.batchGroup=amount>150?4:1;t.transported+=amount;
            t.batchOrigin=t.source.node.worldPosition.clone();
            t.clock=.02;
        }else t.clock=Math.min(.5,t.clock+dt);
        // In the original each emission waits .02 s; large batches emit four
        // individual projectiles per tick after reserving up to 200 foods.
        while(t.clock>=.02&&t.batchRemaining>0){
            t.clock-=.02;
            const group=Math.min(t.batchGroup,t.batchRemaining);
            for(let j=0;j<group;j++){
                const food=t.source.foodType,exitLocal=t.exit.node.position.clone();
                const exit=()=>isValid(t.exit.node,true)?t.exit.node.worldPosition.clone():this.node.getComponent(UITransform)!.convertToWorldSpaceAR(exitLocal);
                const origin=this.feeding.offsetMapPoint(t.batchOrigin,t.batchGroup===4?Math.random()*20-10:0,100);
                this.feeding.launch(origin,food,()=>isValid(t.entry.node,true)?t.entry.node.worldPosition.clone():exit(),
                    ()=>this.feeding.deliver(this.feeding.offsetMapPoint(exit(),Math.random()*20-10,30),food,1.5,350+Math.random()*200),1,300+Math.random()*100,true,
                    {kind:'tunnel',exitX:exitLocal.x,exitY:exitLocal.y});
            }
            t.batchRemaining-=group;
        }
    }
    update(dt:number):void {
        if(this.saved?.tunnels.length){for(let i=this.saved.tunnels.length-1;i>=0;i--){const t=this.saved.tunnels[i];if(this.feeding.findSource(t.source)){this.makeTunnel(t);this.saved.tunnels.splice(i,1);}}}
        for(let i=this.hatches.length-1;i>=0;i--){
            const h=this.hatches[i],old=h.age;h.age+=dt;
            if(old<2&&h.age>=2)OriginalParticles.burst(this.node,h.hole.node.position,PRESENTATION.tunnel.particles[1]);
            this.showHole(h.hole,h.age,Math.max(0,Math.min(1,1-(h.age-5)/1.5)));
            if(!h.counted&&h.age>=7){h.counted=true;this.state.activeTunnellers++;if(!this.makeTunnel())this.retryClock=1;this.clock=30/this.state.activeTunnellers;}
            if(h.age>=8){h.hole.node.destroy();this.hatches.splice(i,1);if(this.state.activeTunnellers>=2)unlockAchievement('2_tunnellers');}
        }
        const count=this.state.activeTunnellers;
        if(count){
            this.clock-=dt;
            if(this.clock<=0){if(!this.makeTunnel())this.retryClock=1;this.clock=30/count;}
            if(this.retryClock>0){this.retryClock-=dt;if(this.retryClock<=0&&!this.makeTunnel())this.retryClock=1;}
        }
        for(let i=this.tunnels.length-1;i>=0;i--){
            const t=this.tunnels[i],oldAge=t.age;t.age+=dt;
            if(oldAge<2&&t.age>=2)OriginalParticles.burst(this.node,t.entry.node.position,PRESENTATION.tunnel.particles[1]);
            if(oldAge<4&&t.age>=4)this.startDirt(t.exit.node);
            if(oldAge<6&&t.age>=6)OriginalParticles.burst(this.node,t.exit.node.position,PRESENTATION.tunnel.particles[1]);
            if(t.age>=7&&t.closingAt===null)this.updateTransport(t,dt);
            const fade=t.closingAt===null?1:Math.max(0,Math.min(1,1-(t.age-t.closingAt)/1.5));
            this.showHole(t.entry,t.age,fade);this.showHole(t.exit,t.age-4,fade);
            if(t.closingAt!==null&&t.age>=t.closingAt+2){t.entry.node.destroy();t.exit.node.destroy();this.tunnels.splice(i,1);}
        }
        const den=this.buildings.find(n=>n.name==='TunnellerDen');if(den)buildingReadout(den,'Count',[
            {value:String(count),icon:'original/GenePanel/Evolution Icons/Worms'},
            {value:String(this.tunnels.length),icon:'original/GenePanel/Evolution Icons/HoleUnlock'},
        ],0,170,500,24);
    }
    onDestroy():void {this.feeding?.upgrades?.node.off('upgrade-purchased',this.synchronize,this);this.feeding?.upgrades?.node.off('genes-changed',this.synchronize,this);for(const h of this.hatches)if(isValid(h.hole.node,true))h.hole.node.destroy();this.workers.forEach(w=>{if(isValid(w.node,true))w.retire();});this.buildings.forEach(disposeFacility);for(const t of this.tunnels){if(isValid(t.entry.node,true))t.entry.node.destroy();if(isValid(t.exit.node,true))t.exit.node.destroy();}}
}
