import { UI_RULES, QUEEN_MILESTONES, DNA_MILESTONES } from '../config/UIConfig';
import { FOOD_ITEMS } from '../config/ItemConfig';
import { ECONOMY } from '../config/EconomyConfig';
import { RATE_BUFFS, FOOD_NAMES } from '../config/FeedingRateConfig';
import { feedingRateDescription, queenMilestoneDescription, dnaMilestoneDescription, tooltipIcon, buffDescription } from '../config/HudTooltipConfig';
import { originalText } from '../config/OriginalText';
import { FeedingModel } from '../core/FeedingModel';
import { foodDetails } from '../config/FoodTooltip';
import { _decorator, Component, Label, Node, ProgressBar, UITransform, Sprite, SpriteAtlas, Graphics, Color, EventTouch, EventMouse, RichText, instantiate, Vec3, screen, Button, Tween, tween, sys, Prefab } from 'cc';
import { RateStatusLayout } from './RateStatusLayout';
import { UpgradeResources } from './UpgradeState';
import { formatOriginal, milestoneProgress, OriginalVisibility } from './OriginalUIRules';
import { useDefaultSystemFont } from './DefaultSystemFont';
const { ccclass, property } = _decorator;
export interface GameStatus {
    feedingRate: number; queenLevel: number; nextQueenRate: number; previousQueenRate: number;
    dna: number; nextDnaRate: number; previousDnaRate: number;
    addend: number; multiplier: number; heat: number; cold: number; sour: number;
    frostburn: number; frostburnThreshold: number; umami: number; ecstasy: number; shine: number;
    sourAddend: number; ecstasyStacks: number; shineStacks: number;
}
/** Presentation only: feeding simulation supplies the authoritative rolling 60-second data. */
@ccclass('GameHUD')
export class GameHUD extends Component {
    @property(Prefab) ratePanelPrefab: Prefab|null = null;
    private statusRoot!: Node;
    private rateLayout!: RateStatusLayout;
    private growthLayout = new Map<string,{position:Vec3,width:number,height:number}>();
    private authoredGrowthHeight = 0;
    private toggleOffset = new Vec3();
    private toggleScale = new Vec3(1,1,1);
    private wallet: UpgradeResources = { ...ECONOMY.initialResources };
    private visibility = new OriginalVisibility();
    private buffSeen = new Set<number>();
    private foodRates: Record<number,number> = {};
    private foodAmounts: Record<number,number> = {};
    private tasteModel:FeedingModel|null=null;
    private goldenApples=false;
    public setTasteModel(model:FeedingModel,goldenApples=false):void {this.tasteModel=model;this.goldenApples=goldenApples;}
    private tooltip: Node|null = null;
    private pinnedTooltip = false;
    private tooltipDescribe: (()=>string)|null = null;
    private tooltipPath = '';
    private tooltipAtlas: SpriteAtlas|null = null;
    private panelScale = 1;
    private tooltipScale = 1;
    private get panelTop():number { return this.rateLayout.panelTop; }
    private statusCollapsed = false;
    private statusBaseX = 0;
    private statusToggle: Node|null = null;
    private status: GameStatus = { feedingRate:0,queenLevel:0,nextQueenRate:QUEEN_MILESTONES[0],previousQueenRate:0,
        dna:0,nextDnaRate:DNA_MILESTONES[0],previousDnaRate:0,addend:0,multiplier:1,heat:0,cold:0,sour:0,
        frostburn:0,frostburnThreshold:UI_RULES.frostburnThreshold,umami:0,ecstasy:0,shine:0,
        sourAddend:0,ecstasyStacks:0,shineStacks:0 };
    onLoad(): void {
        if(!this.ratePanelPrefab)throw new Error('GameHUD: RateStatusPanel prefab is not assigned');
        this.statusRoot=instantiate(this.ratePanelPrefab);
        this.node.addChild(this.statusRoot);
        this.rateLayout=this.statusRoot.getComponent(RateStatusLayout)!;
        this.alignMilestoneProgressWithFoodRows();
        const growth=this.statusRoot.getChildByName('Growth')!;
        this.authoredGrowthHeight=growth.getComponent(UITransform)!.height;
        for(const child of growth.children){
            const size=child.getComponent(UITransform);
            this.growthLayout.set(child.name,{position:child.position.clone(),width:size?.width||0,height:size?.height||0});
        }
        this.statusToggle=this.statusRoot.getChildByName('RateStatusToggle');
        if(this.statusToggle){
            this.toggleOffset.set(this.statusToggle.position.x-growth.position.x-growth.getComponent(UITransform)!.width/2,this.statusToggle.position.y-this.panelTop,0);
            this.toggleScale.set(this.statusToggle.scale);
            const button=this.statusToggle.getComponent(Button);
            if(button)button.transition=Button.Transition.NONE;
            this.statusToggle.on(Button.EventType.CLICK,this.toggleStatusPanel,this);
        }
        this.node.parent!.parent!.on(Node.EventType.SIZE_CHANGED,this.layoutAtTop,this);
        this.statusRoot.getChildByName('Growth')!.active=true;
        this.statusRoot.getChildByName('Progress')!.active=true;
        this.initTooltips();
        this.layoutAtTop(); this.renderStatus();
    }
    onDestroy(): void { this.node.parent?.parent?.off(Node.EventType.SIZE_CHANGED,this.layoutAtTop,this); }
    private layoutAtTop(): void {
        const canvas=this.node.parent!.parent!.getComponent(UITransform)!;
        // SafeTopAnchor preserves the scene-authored HUD position and notch inset.
        // Reserve the first screen row for currencies, then keep the left HUD compact.
        const windowWidth = screen.windowSize.width;
        this.panelScale=Math.max(this.rateLayout.minScale,Math.min(this.rateLayout.maxScale,this.rateLayout.referenceWidth/windowWidth));
        this.tooltipScale=Math.max(1,Math.min(1.7,700/windowWidth));
        this.statusBaseX=-canvas.width/2+this.rateLayout.leftMargin+this.statusRoot.getChildByName('Growth')!.getComponent(UITransform)!.width*this.panelScale/2;
        const statusX=this.statusBaseX+(this.statusCollapsed?this.statusHiddenOffset(canvas):0);
        for (const name of ['Growth','Progress']) {
            const n=this.statusRoot.getChildByName(name)!;
            Tween.stopAllByTarget(n);
            n.setScale(this.panelScale,this.panelScale,1);
            n.setPosition(statusX,n.position.y);
        }
        this.layoutStatusToggle(canvas,false);
        this.renderCurrencies();
        if(this.statusRoot.getChildByName('Growth')?.getChildByName('RateApple'))this.renderFoods();
    }
    public setResources(resources: UpgradeResources): void {
        this.wallet={...resources}; this.visibility.update(resources.greyMatter,false); this.renderCurrencies();
    }
    /** Call on building creation/load. Original returning runs show growth from the start. */
    public setProgression(evolutionBuilt: boolean,runId=1,hasHadBrain=false): void {
        this.visibility.hasHadBrain ||= hasHadBrain;
        this.visibility.update(this.wallet.greyMatter,evolutionBuilt,runId);
        this.renderCurrencies();
    }
    private renderCurrencies(): void {
        const values=[this.wallet.nutrients,this.wallet.larvae,this.wallet.greyMatter,this.status.dna];
        const shown=this.visibility.currencies(this.status.dna);
        values.forEach((value,i)=>{
            const cell=this.hudNode(`Currencies/Resource${i}`)!; cell.active=shown[i];
            if(cell.active)this.label(`Currencies/Resource${i}/Value`).string=formatOriginal(value);
        });
    }
    public setStatus(next: Partial<GameStatus>): void {
        const merged={...this.status,...next};
        for(const key of Object.keys(merged) as (keyof GameStatus)[]) if(!Number.isFinite(merged[key])||merged[key]<0)throw new Error(`Invalid status: ${key}`);
        this.status=merged; this.renderStatus();
    }
    /** Food IDs 1..19 match food_data.gd. Values are contributions in the last 60 seconds. */
    public setFoodContributions(rates: Record<number,number>): void {
        for(const key of Object.keys(rates))if(!Number.isFinite(rates[+key])||rates[+key]<0)throw new Error('Invalid food contribution');
        this.foodRates={...rates}; this.renderFoods();
    }
    /** Atomic 60-second snapshot from the feeding simulation. */
    public setFeedingSnapshot(rate:number, contributions:Record<number,number>, amounts:Record<number,number>):void {
        for(const key of Object.keys(amounts))if(!Number.isFinite(amounts[+key])||amounts[+key]<0)throw new Error('Invalid food amount');
        for(const key of Object.keys(contributions))if(!Number.isFinite(contributions[+key])||contributions[+key]<0)throw new Error('Invalid food contribution');
        this.foodAmounts={...amounts};
        this.foodRates={...contributions};
        this.setStatus({feedingRate:rate});
    }
    private renderFoods():void {
        const root=this.hudNode('Growth/Foods');if(!root)return;
        const layout=this.rateLayout;
        // Buff contributions share this ledger but are not food rows.
        const maximum=Math.max(0,...FOOD_ITEMS.map(food=>this.foodRates[food.id]||0));
        let slot=0;
        for(const row of root.children){
            const foodId=Number(/^Food(\d+)$/.exec(row.name)?.[1]);
            if(!FOOD_ITEMS.some(food=>food.id===foodId))continue;
            const value=this.foodRates[foodId]||0;row.active=value>0;
            if(row.active){
                if(layout.autoLayout)row.setPosition(row.position.x,-slot*layout.rowHeight,row.position.z);
                slot++;this.progress('Growth/Foods/'+row.name+'/Bar',maximum>0?value/maximum:0);
            }
        }
        if(!layout.autoLayout)return;
        const growth=this.statusRoot.getChildByName('Growth')!;
        const hasBonus=this.status.addend!==0||this.status.multiplier!==1;
        const hasBuffs=this.buffSeen.size>0;
        const foodTop=layout.headingHeight+(hasBonus?layout.bonusHeight:0)+(hasBuffs?layout.buffsHeight:0);
        const height=Math.max(layout.minHeight,foodTop+slot*layout.rowHeight+layout.bottomPadding);
        growth.getComponent(UITransform)!.height=height;
        growth.setPosition(growth.position.x,this.panelTop-height*this.panelScale/2);
        const delta=(height-this.authoredGrowthHeight)/2;
        for(const name of ['Header','FeedingRate','RateApple','RateUnit','Bonus','BonusBackground','Multiplier','MultiplierBackground']){
            const child=growth.getChildByName(name),saved=this.growthLayout.get(name);
            if(child&&saved)child.setPosition(saved.position.x,saved.position.y+delta,saved.position.z);
        }
        const both=this.status.addend!==0&&this.status.multiplier!==1;
        const red=this.growthLayout.get('BonusBackground')!,blue=this.growthLayout.get('MultiplierBackground')!;
        const left=red.position.x-red.width/2,right=blue.position.x+blue.width/2;
        for(const name of ['Bonus','BonusBackground','Multiplier','MultiplierBackground']){
            const child=growth.getChildByName(name)!,saved=this.growthLayout.get(name)!;
            child.setPosition(both?saved.position.x:(left+right)/2,child.position.y);
            child.getComponent(UITransform)!.width=both?saved.width:right-left;
            const line=child.getChildByName('BottomBorder');
            if(line)line.getComponent(UITransform)!.width=child.getComponent(UITransform)!.width;
        }
        const buffs=growth.getChildByName('Buffs')!,buffSaved=this.growthLayout.get('Buffs')!;
        buffs.setPosition(buffSaved.position.x,buffSaved.position.y+delta+(hasBonus?0:layout.bonusHeight));
        const foodSaved=this.growthLayout.get('Foods')!;
        root.setPosition(foodSaved.position.x,foodSaved.position.y+delta+(hasBonus?0:layout.bonusHeight)+(hasBuffs?0:layout.buffsHeight));
        const progress=this.statusRoot.getChildByName('Progress')!;
        progress.setPosition(progress.position.x,this.panelTop-height*this.panelScale-layout.progressGap-progress.getComponent(UITransform)!.height*this.panelScale/2);
    }
    private renderStatus(): void {
        const s=this.status; this.renderCurrencies();
        this.label('Growth/FeedingRate').string=formatOriginal(s.feedingRate);
        this.label('Growth/Bonus').string=`+ ${Math.trunc(s.addend)}`;
        for(const name of ['Bonus','BonusBackground'])this.hudNode(`Growth/${name}`)!.active=s.addend!==0;
        for(const name of ['Multiplier','MultiplierBackground']){const n=this.hudNode(`Growth/${name}`);if(n)n.active=s.multiplier!==1;}
        const multiplier=this.hudNode('Growth/Multiplier')?.getComponent(Label);if(multiplier)multiplier.string=`x ${s.multiplier.toFixed(1)}`;
        this.label('Progress/QueenLabel').string=''; this.label('Progress/QueenValue').string='';
        // The original milestone box shows icons and fill only; thresholds live
        // in its hover text, not as a stray numeric label inside the box.
        this.hudNode('Progress/DnaValue')!.active=false;
        this.progress('Progress/QueenProgress',milestoneProgress(s.feedingRate,s.queenLevel>0?s.previousQueenRate*UI_RULES.milestonePreviousFactor:0,s.nextQueenRate,true));
        this.progress('Progress/DnaProgress',milestoneProgress(s.feedingRate,s.dna>0?s.previousDnaRate*UI_RULES.milestonePreviousFactor:0,s.nextDnaRate,false));
        // Scene icons are heat, cold, frostburn, sour, umami, ecstasy, shine.
        const active=(['heat','cold','frostburn','sour','umami','ecstasy','shine'] as const).map(key=>this.buffActive(key));
        active.forEach((v,i)=>{if(v)this.buffSeen.add(i);});
        const buffs=this.hudNode('Growth/Buffs');
        if(buffs){let slot=0;
            // Preserve the order in the Godot scene, while keeping seen effects visible but gray.
            for(const i of [0,3,1,2,5,6,4]){const n=buffs.children[i];n.active=this.buffSeen.has(i);if(n.active){if(this.rateLayout.autoLayout)n.setPosition((slot++-(this.buffSeen.size-1)/2)*(n.getComponent(UITransform)!.width+3),n.position.y);n.getComponent(Sprite)!.grayscale=!active[i];}}
        }
        this.hudNode('Growth/Tastes')!.active=false;
        this.hudNode('Growth/TasteTitle')!.active=false;
        this.renderFoods();
        if(this.tooltip?.active&&this.tooltipDescribe)this.renderTooltipContent(this.tooltipPath,this.tooltipDescribe());
    }
    private hudNode(path:string):Node|null {
        return /^(Growth|Progress)(\/|$)/.test(path)?this.statusRoot.getChildByPath(path):this.node.getChildByPath(path);
    }
    private progress(path:string,value:number):void {
        const bar=this.hudNode(path)?.getComponent(ProgressBar);
        if(!bar)return;
        const progress=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
        const fill=bar.barSprite;
        if(fill){fill.enabled=true;fill.node.active=progress>0;}
        bar.progress=progress;
        this.drawFillOutline(bar);
    }
    private drawFillOutline(bar:ProgressBar):void {
        const fill=bar.barSprite?.node,size=fill?.getComponent(UITransform);if(!fill||!size)return;
        bar.node.getChildByName('BarOutline')?.destroy();
        let outline=fill.getChildByName('FillOutline');
        if(!outline){outline=new Node('FillOutline');outline.layer=fill.layer;fill.addChild(outline);outline.addComponent(UITransform);outline.addComponent(Graphics);}
        const g=outline.getComponent(Graphics)!;g.clear();
        outline.active=bar.progress>0;
        if(!outline.active)return;
        const width=size.width,height=size.height;
        g.lineWidth=Math.min(2,width,height);g.strokeColor=Color.BLACK;
        const inset=g.lineWidth/2;
        g.rect(-width*size.anchorX+inset,-height*size.anchorY+inset,Math.max(0,width-g.lineWidth),Math.max(0,height-g.lineWidth));g.stroke();
    }
    private alignMilestoneProgressWithFoodRows():void {
        const food=this.statusRoot.getChildByPath('Growth/Foods/Food1');
        const progress=this.statusRoot.getChildByName('Progress');
        const icon=food?.getChildByName('Icon');
        const foodBar=food?.getChildByName('Bar');
        const iconPosition=icon?.position;
        const barPosition=foodBar?.position;
        const barTransform=foodBar?.getComponent(UITransform);
        if(!progress||!iconPosition||!barPosition||!barTransform)return;

        for(const name of ['QueenIcon','DnaIcon']){
            const node=progress.getChildByName(name);
            if(node)node.setPosition(iconPosition.x,node.position.y,node.position.z);
        }
        for(const name of ['QueenProgress','DnaProgress']){
            const node=progress.getChildByName(name);
            const transform=node?.getComponent(UITransform);
            const bar=node?.getComponent(ProgressBar);
            if(!node||!transform||!bar)continue;
            transform.width=barTransform.width;
            node.setPosition(barPosition.x,node.position.y,node.position.z);
            bar.totalLength=barTransform.width;
            const fill=bar.barSprite?.node;
            const fillTransform=fill?.getComponent(UITransform);
            if(fill&&fillTransform){
                fillTransform.width=barTransform.width;
                fill.setPosition(-barTransform.width/2,fill.position.y,fill.position.z);
            }
        }
    }
    private label(path:string):Label { return this.hudNode(path)!.getComponent(Label)!; }

    private statusHiddenOffset(canvas:UITransform):number {
        const growth=this.statusRoot.getChildByName('Growth');
        const progress=this.statusRoot.getChildByName('Progress');
        const halfWidth=Math.max(growth?.getComponent(UITransform)?.width||0,progress?.getComponent(UITransform)?.width||0)*this.panelScale/2;
        return -(this.statusBaseX+halfWidth+canvas.width/2+12);
    }

    private toggleStatusPanel():void { this.setStatusCollapsed(!this.statusCollapsed,true); }

    private setStatusCollapsed(collapsed:boolean,animate:boolean):void {
        this.statusCollapsed=collapsed;
        if(collapsed)this.hideTooltip();
        const canvas=this.node.parent?.parent?.getComponent(UITransform);
        if(!canvas)return;
        const targetX=this.statusBaseX+(collapsed?this.statusHiddenOffset(canvas):0);
        for(const name of ['Growth','Progress']){
            const panel=this.statusRoot.getChildByName(name);if(!panel)continue;
            const position=new Vec3(targetX,panel.position.y,panel.position.z);
            Tween.stopAllByTarget(panel);
            if(animate)tween(panel).to(UI_RULES.panelSlideSeconds,{position},{easing:'quadOut'}).start();
            else panel.setPosition(position);
        }
        this.layoutStatusToggle(canvas,animate);
    }

    private layoutStatusToggle(canvas:UITransform,animate:boolean):void {
        const button=this.statusToggle;if(!button)return;
        const size=button.getComponent(UITransform);if(!size)return;
        const safe=sys.getSafeAreaRect();
        const safeLeft=Math.max(-canvas.width/2,safe.x-canvas.width/2);
        const safeRight=Math.min(canvas.width/2,safe.x+safe.width-canvas.width/2);
        const halfWidth=size.width*Math.abs(this.toggleScale.x)/2;
        const growth=this.statusRoot.getChildByName('Growth');
        const growthWidth=(growth?.getComponent(UITransform)?.width||238)*this.panelScale;
        const openX=this.statusBaseX+growthWidth/2+this.toggleOffset.x;
        const x=this.statusCollapsed
            ?Math.min(safeRight-halfWidth-8,safeLeft+halfWidth+8)
            :Math.min(safeRight-halfWidth-8,Math.max(safeLeft+halfWidth+8,openX));
        const y=this.panelTop+this.toggleOffset.y;
        button.active=true;
        button.setScale(this.toggleScale.x*(this.statusCollapsed?-1:1),this.toggleScale.y,this.toggleScale.z);
        const position=new Vec3(x,y,button.position.z);
        Tween.stopAllByTarget(button);
        if(animate)tween(button).to(UI_RULES.panelSlideSeconds,{position},{easing:'quadOut'}).start();
        else button.setPosition(position);
    }

    private initTooltips():void {
        const bind=(path:string,describe:()=>string):void=>{
            const target=this.hudNode(path);if(!target)return;
            target.on(Node.EventType.MOUSE_ENTER,(event:EventMouse)=>{if(!this.pinnedTooltip)this.showTooltip(target,describe,path,event);},this);
            target.on(Node.EventType.MOUSE_MOVE,(event:EventMouse)=>{
                if(!this.pinnedTooltip&&this.tooltip?.active&&this.tooltipPath===path)this.positionTooltip(event.getUILocation());
            },this);
            target.on(Node.EventType.MOUSE_LEAVE,()=>{if(!this.pinnedTooltip)this.hideTooltip();},this);
            target.on(Node.EventType.TOUCH_START,(event:EventTouch)=>{
                event.propagationStopped=true;
                if(this.pinnedTooltip&&this.tooltip?.active&&this.tooltipPath===path){this.hideTooltip();return;}
                this.pinnedTooltip=true;this.showTooltip(target,describe,path,event);
            },this);
        };
        bind('Growth/FeedingRate',feedingRateDescription);
        bind('Growth/RateApple',feedingRateDescription);
        bind('Growth/RateUnit',feedingRateDescription);
        bind('Growth/Header',feedingRateDescription);
        bind('Growth/Bonus',()=>this.bonusDescription(false));
        bind('Growth/Multiplier',()=>this.bonusDescription(true));
        ['FOOD','LARVAE','BRAIN_MATTER','DNA'].forEach((key,i)=>bind(`Currencies/Resource${i}`,()=>originalText('DESCRIPTION_'+key)));
        bind('Progress/QueenProgress',()=>queenMilestoneDescription(formatOriginal(this.status.nextQueenRate)));
        bind('Progress/DnaProgress',()=>dnaMilestoneDescription(formatOriginal(this.status.nextDnaRate)));
        bind('Progress/QueenIcon',()=>queenMilestoneDescription(formatOriginal(this.status.nextQueenRate)));
        bind('Progress/DnaIcon',()=>dnaMilestoneDescription(formatOriginal(this.status.nextDnaRate)));
        for(const food of FOOD_ITEMS)bind(`Growth/Foods/Food${food.id}`,()=>'');
        // Node order follows the Cocos scene; presentation order is adjusted in renderStatus.
        const keys=['heat','cold','frostburn','sour','umami','ecstasy','shine'] as const;
        keys.forEach((key,i)=>bind(`Growth/Buffs/Buff${i}`,()=>{
            const index=RATE_BUFFS.findIndex(buff=>buff.key===key);
            const buff=RATE_BUFFS[index];
            const s=this.tasteModel?.state,genes=this.tasteModel?.options.specialisations||{};
            const stacks=s?key==='cold'?s.cold+s.coldPre:s[key]:this.status[key];
            const values=s?{heat:s.heatBonus,cold:this.tasteModel!.coldStrength,frostburn:s.frostburnBonus,sour:genes.sour_addend?s.sourAddend:s.sourBonus,umami:0,ecstasy:s.ecstasyBonus,shine:s.shineBonus}:this.status;
            return buffDescription(key,{active:this.buffActive(key),stacks,value:values[key],contribution:this.foodRates[buff.contributionId]||0,coldStrength:this.tasteModel?.coldStrength||.5,harmony:!!genes.harmony,acid:!!genes.acid,sourAddend:!!genes.sour_addend},formatOriginal);
        }));
    }

    private buffActive(key:'heat'|'cold'|'frostburn'|'sour'|'umami'|'ecstasy'|'shine'):boolean {
        const s=this.status;
        switch(key){
        case 'heat': return s.heat>UI_RULES.heatActiveThreshold;
        case 'cold': return s.cold>0;
        case 'frostburn': return s.frostburn>s.frostburnThreshold;
        case 'sour': return s.sour>0||s.sourAddend>0;
        case 'umami': return s.umami>0;
        case 'ecstasy': return s.ecstasy>0;
        case 'shine': return s.shine>0;
        }
    }

    private bonusDescription(multiplier:boolean):string {
        let text=originalText(multiplier?'DESCRIPTION_MULTIPLIER':'DESCRIPTION_BONUS',{value:multiplier?this.status.multiplier.toFixed(1):formatOriginal(this.status.addend)});
        const model=this.tasteModel;if(!model)return text;
        const s=model.state,o=model.options,genes=o.specialisations;
        const diet=Object.keys(this.foodRates).map(Number).filter(id=>id<=19&&this.foodRates[id]>0);
        const add=(key:string,value:number,operation='+')=>{if(value>0)text+='<br/>'+originalText(key)+': '+operation+String(Math.round(value*100)/100);};
        text+='<br/>';
        if(multiplier){
            add('EVOLUTION_TITLE_SORORITY',o.sororityBonus);
            add('SPECIALISATION_TITLE_BALANCED',genes.balanced_diet?diet.length*.2:0);
            add('SPECIALISATION_TITLE_TRACK',genes.one_track_mind&&diet.length<=3?3:0);
            add('SPECIALISATION_TITLE_GOURMET',genes.gourmet&&diet.filter(id=>id>=15&&id<=19).length>=2?6:0);
            for(const [name,value] of [['COLD',s.coldBonus],['FROSTBURN',s.frostburnBonus],['SOUR',s.sourBonus],['ECSTASY',s.ecstasyBonus],['SHINE',s.shineBonus]] as [string,number][])add('{NAME_STATUS_'+name+'}',value);
            if(o.clearFactor>1)add('{NAME_SHROOM_CLEAR}',o.clearFactor,'x');
        }else{
            add('SPECIALISATION_TITLE_SWEET',genes.sweet_tooth?diet.filter(id=>[1,2,3,4,6,8,15,16,18].includes(id)).length*8:0);
            add('{NAME_STATUS_HEAT}',s.heatBonus);add('{NAME_STATUS_SOUR}',s.sourAddend);
            if(o.verdantFactor>1)add('{NAME_SHROOM_VERDANT}',o.verdantFactor,'x');
        }
        return text;
    }

    private showTooltip(target:Node,describe:()=>string,path='',event?:EventMouse|EventTouch):void {
        if(!this.tooltip){
            const tip=new Node('RateTip');tip.layer=this.node.layer;
            tip.addComponent(UITransform).setContentSize(410,142);
            const graphics=tip.addComponent(Graphics);
            const textNode=new Node('Text');textNode.layer=this.node.layer;tip.addChild(textNode);
            const textTransform=textNode.addComponent(UITransform);textTransform.setContentSize(390,120);textTransform.setAnchorPoint(0,1);
            const label=textNode.addComponent(RichText);useDefaultSystemFont(label);
            label.fontSize=18;label.lineHeight=24;label.maxWidth=390;label.fontColor=Color.BLACK;
            const atlas=new SpriteAtlas('HudTooltipIcons');
            atlas.spriteFrames.food=this.hudNode('Currencies/Resource0/Icon')!.getComponent(Sprite)!.spriteFrame!;
            atlas.spriteFrames.dna=this.hudNode('Progress/DnaIcon')!.getComponent(Sprite)!.spriteFrame!;
            for(const food of FOOD_ITEMS)atlas.spriteFrames['source'+food.id]=this.hudNode(`Growth/Foods/Food${food.id}/Icon`)!.getComponent(Sprite)!.spriteFrame!;
            ['heat','cold','frostburn','sour','umami','ecstasy','shine'].forEach((key,i)=>{atlas.spriteFrames[key]=this.hudNode('Growth/Buffs/Buff'+i)!.getComponent(Sprite)!.spriteFrame!;});
            label.imageAtlas=atlas;this.tooltipAtlas=atlas;
            tip.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{e.propagationStopped=true;this.hideTooltip();},this);
            this.node.addChild(tip);this.tooltip=tip;
        }
        this.tooltipPath=path;
        this.tooltipDescribe=describe;
        this.tooltip.setScale(this.tooltipScale,this.tooltipScale,1);
        this.renderTooltipContent(path,describe());
        this.node.setSiblingIndex(this.node.parent!.children.length-1);
        this.tooltip.active=true;this.tooltip.setSiblingIndex(this.node.children.length-1);
        this.positionTooltip(event?.getUILocation(),target);
    }
    private renderTooltipContent(path:string,description:string):void {
        if(!this.tooltip)return;
        const foodId=Number(path.match(/^Growth\/Foods\/Food(\d+)$/)?.[1]||0);
        const food=FOOD_ITEMS.find(item=>item.id===foodId);
        const textComponent=this.tooltip.getChildByName('Text')!.getComponent(RichText)!;
        textComponent.maxWidth=390;
        if(food){
            const source=`<color=#${food.color}><b>${FOOD_NAMES[foodId-1]}</b></color> ${tooltipIcon('source'+foodId)}`;
            const amount=`<b>${formatOriginal(this.foodAmounts[foodId]||0)}</b>`,value=`<b>${formatOriginal(this.foodRates[foodId]||0)}</b>`;
            textComponent.string=originalText('DESCRIPTION_FOOD_CONTRIBUTION',{source,amount,value})+'<br/><br/>'+foodDetails(foodId,food.baseNutrition,this.tasteModel,this.goldenApples);
        }else textComponent.string=description;
        const h=Math.max(52,textComponent.node.getComponent(UITransform)!.height+24);
        const width=410;
        this.tooltip.getComponent(UITransform)!.setContentSize(width,h);
        const graphics=this.tooltip.getComponent(Graphics)!;
        graphics.clear();graphics.fillColor=new Color(252,230,195);
        graphics.strokeColor=new Color(67,21,17);graphics.lineWidth=4;
        graphics.roundRect(-width/2,-h/2,width,h,10);graphics.fill();graphics.stroke();
        const textNode=this.tooltip.getChildByName('Text')!;
        textNode.setPosition(-width/2+10,h/2-12);
        const text=textNode.getComponent(RichText)!;
        text.maxWidth=390;
    }
    private positionTooltip(point?:{x:number;y:number},target?:Node):void {
        if(!this.tooltip)return;
        const targetPosition=point
            ?this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(point.x,point.y,0))
            :this.node.getComponent(UITransform)!.convertToNodeSpaceAR(target!.worldPosition);
        const canvas=this.node.parent!.parent!.getComponent(UITransform)!;
        const size=this.tooltip.getComponent(UITransform)!.contentSize;
        const width=size.width*this.tooltipScale,height=size.height*this.tooltipScale;
        const left=-canvas.width/2-this.node.position.x,right=canvas.width/2-this.node.position.x;
        const bottom=-canvas.height/2-this.node.position.y,top=canvas.height/2-this.node.position.y;
        let x=targetPosition.x+20+width/2;
        let y=this.pinnedTooltip?targetPosition.y+20+height/2:targetPosition.y-20-height/2;
        if(x+width/2>right)x=targetPosition.x-20-width/2;
        if(y+height/2>top)y=targetPosition.y-20-height/2;
        if(y-height/2<bottom)y=targetPosition.y+20+height/2;
        this.tooltip.setPosition(Math.max(left+width/2,Math.min(right-width/2,x)),
            Math.max(bottom+height/2,Math.min(top-height/2,y)));
    }
    private hideTooltip():void {if(this.tooltip)this.tooltip.active=false;this.pinnedTooltip=false;this.tooltipDescribe=null;this.tooltipPath='';}
}
