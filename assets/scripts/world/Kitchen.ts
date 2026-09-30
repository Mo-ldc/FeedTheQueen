import { Color } from "cc";
import { UPGRADE_GROUPS } from '../config/UpgradeConfig';
import { FOOD_ITEMS } from "../config/ItemConfig";
import { OriginalParticles } from "./OriginalParticles";
import { PRESENTATION } from "../config/PresentationConfig";
import { unlockAchievement } from '../core/PlayerMeta';
import { FACILITY_ANIMATIONS } from '../config/FacilityAnimations';
import { originalSample } from './OriginalAnimation';
import { _decorator, Component, Node, Vec3, Sprite, SpriteFrame, isValid } from 'cc';
import { BlueberryFeeding } from './BlueberryFeeding';
import { ColonyPrefabs } from './ColonyPrefabs';
import { WorldLayers } from './WorldLayers';
import { FoodReceiver } from './FoodSource';
import { Food } from '../core/FeedingModel';
import { colonySave } from '../core/ColonyPersistence';
import { cookRecipe, RECIPES } from '../core/KitchenRules';
import { FoodBin, bindFacility, choice, markChoice, disposeFacility } from './FacilitySupport';
import { originalFrame, foodFramePath } from './OriginalArt';
import { buildingReadout } from './BuildingReadout';
import { layoutUpgradeChoiceRow } from '../ui/UpgradeChoiceSkin';
import { BUILDING_POSITIONS } from '../config/MapConfig';
const {ccclass}=_decorator;
export interface KitchenSnapshot {inputs:Record<number,number>;outputs:number[];recipes:boolean[];clock:number;}
@ccclass('Kitchen')
export class Kitchen extends Component {
    private feeding!:BlueberryFeeding;private building:Node|null=null;private outputs:FoodBin[]=[];
    public inputs:Record<number,number>={};private incoming:Record<number,number>={};
    public recipes=[false,false,false,false];private clock=0;private wobble=0;private age=0;
    private pendingWobble=false;
    private lastStockText:string|null=null;private lastProductsText:string|null=null;
    private receiver:FoodReceiver|null=null;private saved:KitchenSnapshot|undefined;private sousChefFrame:SpriteFrame|null=null;private headChefFrame:SpriteFrame|null=null;
    private get state(){return this.feeding.upgrades!.upgradeState;}
    public get capacity(){return 100+25*this.state.level('cuisine_SousChef')+50*this.state.level('mine_clay');}
    public get speed(){return [5,10,20][this.state.level('cuisine_SousChef')]*(this.state.level('mine_clay')?3:1);}
    start():void {
        this.feeding=this.getComponent(BlueberryFeeding)!;this.saved=colonySave.load()?.kitchen;
        if(this.saved){this.inputs={...this.saved.inputs};this.recipes=[...this.saved.recipes];this.clock=this.saved.clock;}
        this.feeding.upgrades!.node.on('upgrade-purchased',this.changed,this);
        const content=this.feeding.upgrades!.optionHeader(10);
        RECIPES.forEach((r,i)=>{const option=choice(content,'Recipe'+i,['蜜恋糖苹果','炙烤肉串','烈焰冰淇淋','绯红之萃'][i],0,-30,310,()=>this.selectRecipe(i));this.feeding.upgrades!.bindOptionTip(option,()=>UPGRADE_GROUPS[10].items.find(item=>item.id==='cuisine_'+r.id)!.description);});
        this.feeding.upgrades!.customHeaders[10]=()=>{
            const unlocked=RECIPES.map((r,i)=>({r,i})).filter(({r})=>!!this.state.level('cuisine_'+r.id));
            const visible:Node[]=[];
            unlocked.forEach(({i})=>{
                const n=content.getChildByName('Recipe'+i)!;
                n.active=true;
                visible.push(n);
            });
            const height=layoutUpgradeChoiceRow(visible);
            visible.forEach(n=>{
                const recipeIndex=Number(n.name.slice(-1));
                markChoice(n,this.recipes[recipeIndex]);
            });
            RECIPES.forEach((r,i)=>{if(!this.state.level('cuisine_'+r.id))content.getChildByName('Recipe'+i)!.active=false;});
            return height;
        };
        originalFrame('original/units/chef_idle').then(f=>this.sousChefFrame=f).catch(console.error);originalFrame('original/units/chef_happy').then(f=>this.headChefFrame=f).catch(console.error);
        this.changed();
    }
    public selectRecipe(i:number):void {if(!this.state.level('cuisine_'+RECIPES[i].id))return;const on=!this.recipes[i];if(!this.state.level('cuisine_CordonBleu'))this.recipes.fill(false);this.recipes[i]=on;this.feeding.upgrades!.refresh();}
    private triggerWobble():void {
        if(this.wobble<=0){
            this.wobble=.6;
        }else{
            this.pendingWobble=true;
        }
    }
    private changed(e?:{id:string}):void {
        if(!this.building&&this.state.level('evolution_BuildingCuisine')){
            this.building=this.getComponent(ColonyPrefabs)!.create('Kitchen',this.getComponent(WorldLayers)!.actors);this.building.setPosition(...BUILDING_POSITIONS.kitchen);bindFacility(this.building,this.feeding.upgrades!,10,!this.saved,()=>this.triggerWobble());
            [[-56,178],[104,7],[-61,-24]].forEach(([x,y],i)=>{const chef=this.getComponent(ColonyPrefabs)!.create('Chef',this.building!.getChildByName('Chefs')!,'Chef'+i);chef.setPosition(x,y);});
            for(let i=0;i<4;i++){const b=new FoodBin(this.building,RECIPES[i].food);b.remaining=this.saved?.outputs[i]||0;this.outputs.push(b);this.feeding.registerSource(b);}
            this.receiver={node:this.building,accepts:f=>this.accepts(f),reserveInput:f=>{if(!this.accepts(f))return false;this.incoming[f]=(this.incoming[f]||0)+1;return true;},receiveInput:f=>{this.incoming[f]=Math.max(0,(this.incoming[f]||0)-1);this.inputs[f]=(this.inputs[f]||0)+1;this.triggerWobble();if(this.inputs[f]>this.capacity)unlockAchievement("overflow");OriginalParticles.burst(this.node,this.building!.position.clone().add3f(-3,110,0),PRESENTATION.kitchen.particles[0],new Color().fromHEX("#"+FOOD_ITEMS.find(i=>i.id===f)!.color));return true;},deliveryPosition:()=>this.feeding!.offsetMapPoint(this.building!.worldPosition,-3,110)};
            this.feeding.registerReceiver(this.receiver);
        }
        if(e){const i=RECIPES.findIndex(r=>'cuisine_'+r.id===e.id);if(i>=0&&!this.recipes.some(Boolean))this.selectRecipe(i);}
        this.feeding.upgrades!.refresh();
    }
    private accepts(food:Food):boolean {return !!this.building&&(this.inputs[food]||0)<(food===2?this.capacity/5:this.capacity)&&this.recipes.some((on,i)=>on&&(RECIPES[i].inputs.some(([f])=>f===food)||(i===0&&food===2)));}
    update(dt:number):void {
        if(!this.building)return;this.clock+=dt;this.age+=dt;this.wobble=Math.max(0,this.wobble-dt);
        if(this.wobble<=0&&this.pendingWobble){this.wobble=.6;this.pendingWobble=false;}
        while(this.clock>=1){let cooked=0;this.clock--;for(let n=0;n<this.speed;n++)for(let i=0;i<4;i++)if(this.recipes[i]){const food=cookRecipe(i,this.inputs);if(!food)continue;unlockAchievement('omelette');cooked++;if(cooked>1)unlockAchievement('cordon');this.triggerWobble();if(food===16)this.feeding.deliver(this.receiver!.deliveryPosition(),food,.8+Math.random()*.8,500+Math.random()*150);else this.outputs[i].remaining++;}}
        const pot=this.building.getChildByName('Cauldron')!;const potScale=originalSample(FACILITY_ANIMATIONS.kitchen.woob.tracks[0],.6-this.wobble,.6,false);pot.setScale(potScale[0],potScale[1],1);
        const chefs=this.building.getChildByName('Chefs')!;chefs.children.forEach((n,i)=>{n.active=i<=this.state.level('cuisine_SousChef');const scale=originalSample(FACILITY_ANIMATIONS.kitchen.Wobble.tracks[i],this.age,2);n.setScale((i===1?-1:1)*scale[0],scale[1],1);const frame=i===0?this.headChefFrame:this.sousChefFrame;if(frame)n.getChildByName('Body')!.getComponent(Sprite)!.spriteFrame=frame;});
        this.refreshInventoryReadout();
    }
    /** Mirrors building_cuisine.gd: show only active recipes, with stock/max and in-flight output included. */
    private refreshInventoryReadout():void {
        if(!this.building)return;
        const ingredients:Food[]=[];
        const add=(food:Food)=>{if(!ingredients.includes(food))ingredients.push(food);};
        if(this.recipes[0]){add(Food.GoldenApple);add(Food.Apple);add(Food.Honeydew);}
        if(this.recipes[1])add(Food.Meat);
        if(this.recipes[2]&&this.recipes[3]){add(Food.Sauce);add(Food.Pepper);add(Food.Iceberry);}
        else {
            if(this.recipes[2]){add(Food.Sauce);add(Food.Iceberry);}
            if(this.recipes[3]){add(Food.Sauce);add(Food.Pepper);}
        }
        const stockLines=ingredients.map(food=>({value:`${this.inputs[food]||0} / ${food===Food.GoldenApple?this.capacity/5:this.capacity}`,icon:foodFramePath(food)}));
        const products=RECIPES.map((recipe,index)=>this.recipes[index]
            ?{value:`${this.outputs[index]?.total||0} / ${this.capacity}`,icon:foodFramePath(recipe.food)}:null)
            .filter((line):line is {value:string;icon:string}=>line!==null);
        const stockText=JSON.stringify(stockLines);
        const productsText=JSON.stringify(products);
        if(stockText!==this.lastStockText){
            this.lastStockText=stockText;
            buildingReadout(this.building,'Stock',stockLines,-150,300,290,20);
        }
        if(productsText!==this.lastProductsText){
            this.lastProductsText=productsText;
            buildingReadout(this.building,'Products',products,150,300,290,20);
        }
    }
    public snapshot():KitchenSnapshot|undefined {if(!this.building)return this.saved;const inputs={...this.inputs};for(const [f,n]of Object.entries(this.incoming))inputs[+f]=(inputs[+f]||0)+n;return {inputs,outputs:this.outputs.map(b=>b.total),recipes:[...this.recipes],clock:this.clock};}
    onDestroy():void {this.pendingWobble=false;this.feeding?.upgrades?.node.off('upgrade-purchased',this.changed,this);for(const b of this.outputs)this.feeding.unregisterSource(b);if(this.receiver)this.feeding.unregisterReceiver(this.receiver);disposeFacility(this.building);}
}
