import { _decorator, Component, Label, Node, UITransform, Sprite, SpriteAtlas, Graphics, Color, EventTouch, RichText, instantiate, Vec3, Button, Prefab, ScrollView, Mask, BlockInputEvents } from 'cc';
import { UI_RULES, QUEEN_MILESTONES, DNA_MILESTONES } from '../config/UIConfig';
import { FOOD_ITEMS } from '../config/ItemConfig';
import { ECONOMY } from '../config/EconomyConfig';
import { RATE_BUFFS, FOOD_NAMES } from '../config/FeedingRateConfig';
import { feedingRateDescription, queenMilestoneDescription, dnaMilestoneDescription, tooltipIcon } from '../config/HudTooltipConfig';
import { originalText } from '../config/OriginalText';
import { FeedingModel } from '../core/FeedingModel';
import { foodDetails } from '../config/FoodTooltip';
import { UpgradeResources } from './UpgradeState';
import { formatOriginal, milestoneProgress } from './OriginalUIRules';
import { useDefaultSystemFont } from './DefaultSystemFont';
import { paperSurface, PORTRAIT } from './PortraitUI';
const { ccclass, property } = _decorator;
export interface GameStatus {
    feedingRate: number; queenLevel: number; nextQueenRate: number; previousQueenRate: number;
    dna: number; nextDnaRate: number; previousDnaRate: number;
    addend: number; multiplier: number; heat: number; cold: number; sour: number;
    frostburn: number; frostburnThreshold: number; umami: number; ecstasy: number; shine: number;
    sourAddend: number; ecstasyStacks: number; shineStacks: number;
}

/** Touch-first portrait summary. The prefab supplies original artwork, not a scaled desktop ledger. */
@ccclass('GameHUD')
export class GameHUD extends Component {
    @property(Prefab) ratePanelPrefab: Prefab|null = null;
    private statusRoot!: Node;
    private summary!: Node;
    private wallet: UpgradeResources = { ...ECONOMY.initialResources };
    private foodRates: Record<number,number> = {};
    private foodAmounts: Record<number,number> = {};
    private tasteModel:FeedingModel|null=null;
    private goldenApples=false;
    private tooltip:Node|null=null;
    private tooltipAtlas:SpriteAtlas|null=null;
    private tooltipDescribe:(()=>string)|null=null;
    private tooltipTitle='';
    private tooltipText='';
    private currencyLayoutKey='';
    private status:GameStatus={feedingRate:0,queenLevel:0,nextQueenRate:QUEEN_MILESTONES[0],previousQueenRate:0,
        dna:0,nextDnaRate:DNA_MILESTONES[0],previousDnaRate:0,addend:0,multiplier:1,heat:0,cold:0,sour:0,
        frostburn:0,frostburnThreshold:UI_RULES.frostburnThreshold,umami:0,ecstasy:0,shine:0,
        sourAddend:0,ecstasyStacks:0,shineStacks:0};

    onLoad():void {
        if(!this.ratePanelPrefab)throw new Error('GameHUD: RateStatusPanel prefab is not assigned');
        this.statusRoot=instantiate(this.ratePanelPrefab);this.node.addChild(this.statusRoot);
        this.statusRoot.active=false;
        this.buildSummary();
        this.node.parent!.parent!.on(Node.EventType.SIZE_CHANGED,this.layoutAtTop,this);
        this.layoutAtTop();this.renderStatus();
    }
    onDestroy():void {
        this.node.parent?.parent?.off(Node.EventType.SIZE_CHANGED,this.layoutAtTop,this);
        this.tooltip?.destroy();
        this.tooltipAtlas?.destroy();
    }
    private child(parent:Node,name:string,w:number,h:number,x=0,y=0):Node {
        let n=parent.getChildByName(name);
        if(!n){n=new Node(name);n.layer=parent.layer;parent.addChild(n);n.addComponent(UITransform);}
        n.getComponent(UITransform)!.setContentSize(w,h);n.setPosition(x,y);return n;
    }
    private caption(parent:Node,name:string,text:string,w:number,h:number,x:number,y:number,fontSize:number):Label {
        const n=this.child(parent,name,w,h,x,y),l=n.getComponent(Label)||n.addComponent(Label);
        useDefaultSystemFont(l);l.string=text;l.fontSize=fontSize;l.lineHeight=fontSize+6;l.color=PORTRAIT.ink;
        l.enableOutline=false;l.isBold=false;l.horizontalAlign=Label.HorizontalAlign.CENTER;
        l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;return l;
    }
    private touchDetails(target:Node,title:string,description:()=>string):void {
        let start=new Vec3();
        target.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{const p=e.getUILocation();start.set(p.x,p.y,0);e.propagationStopped=true;});
        target.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{
            e.propagationStopped=true;const p=e.getUILocation();
            if(Math.hypot(p.x-start.x,p.y-start.y)<=UI_RULES.dragTolerance)this.showDetails(title,description);
        });
    }
    private buildSummary():void {
        this.caption(this.node,'StatusTitle','蚁群状态',250,60,-125,186,34).isBold=true;
        const details=this.child(this.node,'StatusDetails',176,64,262,186);
        paperSurface(details,176,64,PORTRAIT.brown);
        const detailLabel=this.caption(details,'Label','查看详情',164,54,0,0,28);detailLabel.color=new Color(255,245,223);
        details.addComponent(Button).transition=Button.Transition.NONE;
        details.on(Button.EventType.CLICK,()=>this.showDetails('蚁群信息',()=>this.statusDescription()));
        this.summary=this.child(this.node,'PortraitSummary',720,152,0,-32);
        paperSurface(this.summary,720,152);
        this.caption(this.summary,'RateTitle','进食速度',214,36,-236,43,26);
        this.caption(this.summary,'RateValue','0',214,54,-236,-1,38).isBold=true;
        this.caption(this.summary,'RateUnit','食物 / 分钟',214,32,-236,-47,23);
        this.caption(this.summary,'QueenValue','',424,38,112,43,25);
        this.caption(this.summary,'DnaValue','',424,38,112,-25,25);
        for(const [name,y] of [['QueenTrack',15],['DnaTrack',-53]] as [string,number][]){
            this.child(this.summary,name,416,12,112,y).addComponent(Graphics);
        }
        this.touchDetails(this.summary,'成长与基因',()=>this.milestoneDescription());
        ['FOOD','LARVAE','BRAIN_MATTER','DNA'].forEach((key,i)=>{
            const cell=this.node.getChildByPath(`Currencies/Resource${i}`)!;
            this.touchDetails(cell,['食物','幼虫','脑灰质','基因'][i],()=>originalText('DESCRIPTION_'+key));
        });
    }
    private layoutAtTop():void {
        const canvas=this.node.parent!.parent!.getComponent(UITransform)!;
        const scale=Math.min(1,(canvas.width-24)/720);
        this.summary.setScale(scale,scale,1);
        this.renderCurrencies();
        if(this.tooltip?.active)this.renderDetails(true);
    }
    public setTasteModel(model:FeedingModel,goldenApples=false):void {this.tasteModel=model;this.goldenApples=goldenApples;}
    public setResources(resources:UpgradeResources):void {this.wallet={...resources};this.renderCurrencies();}
    public setProgression(_evolutionBuilt:boolean,_runId=1,_hasHadBrain=false):void {this.renderCurrencies();}
    public setStatus(next:Partial<GameStatus>):void {
        const merged={...this.status,...next};
        for(const key of Object.keys(merged) as (keyof GameStatus)[])if(!Number.isFinite(merged[key])||merged[key]<0)throw new Error(`Invalid status: ${key}`);
        this.status=merged;this.renderStatus();
    }
    public setFoodContributions(rates:Record<number,number>):void {
        for(const key of Object.keys(rates))if(!Number.isFinite(rates[+key])||rates[+key]<0)throw new Error('Invalid food contribution');
        this.foodRates={...rates};this.renderStatus();
    }
    public setFeedingSnapshot(rate:number,contributions:Record<number,number>,amounts:Record<number,number>):void {
        for(const key of Object.keys(amounts))if(!Number.isFinite(amounts[+key])||amounts[+key]<0)throw new Error('Invalid food amount');
        for(const key of Object.keys(contributions))if(!Number.isFinite(contributions[+key])||contributions[+key]<0)throw new Error('Invalid food contribution');
        this.foodAmounts={...amounts};this.foodRates={...contributions};this.setStatus({feedingRate:rate});
    }
    private renderCurrencies():void {
        const canvas=this.node.parent!.parent!.getComponent(UITransform)!;
        const width=(canvas.width-32)/4,root=this.node.getChildByName('Currencies')!;
        root.setPosition(0,98);
        const values=[this.wallet.nutrients,this.wallet.larvae,this.wallet.greyMatter,this.status.dna];
        const repaint=this.currencyLayoutKey!==String(width);this.currencyLayoutKey=String(width);
        values.forEach((value,i)=>{
            const cell=root.getChildByName('Resource'+i)!;cell.active=true;
            const label=cell.getChildByName('Value')!.getComponent(Label)!;label.string=formatOriginal(value);
            if(!repaint)return;
            cell.setPosition((i-1.5)*width,0);cell.getComponent(UITransform)!.setContentSize(width-6,90);
            paperSurface(cell,width-6,90);
            this.caption(cell,'ResourceName',['食物','幼虫','脑灰质','基因'][i],width-18,30,0,25,23);
            const icon=cell.getChildByName('Icon')!;icon.setPosition(-width/2+33,-17);icon.getComponent(UITransform)!.setContentSize(30,30);
            label.node.setPosition(20,-17);label.node.getComponent(UITransform)!.setContentSize(width-66,40);
            label.fontSize=30;label.lineHeight=36;label.enableOutline=false;label.color=PORTRAIT.ink;
        });
    }
    private renderStatus():void {
        this.renderCurrencies();if(!this.summary)return;
        const s=this.status;
        this.summary.getChildByName('RateValue')!.getComponent(Label)!.string=formatOriginal(s.feedingRate);
        this.summary.getChildByName('QueenValue')!.getComponent(Label)!.string=`蚁后 Lv.${s.queenLevel+1}  ${formatOriginal(s.feedingRate)} / ${formatOriginal(s.nextQueenRate)}`;
        this.summary.getChildByName('DnaValue')!.getComponent(Label)!.string=`基因 ${formatOriginal(s.dna)}  ${formatOriginal(s.feedingRate)} / ${formatOriginal(s.nextDnaRate)}`;
        const bars=[milestoneProgress(s.feedingRate,s.queenLevel>0?s.previousQueenRate*UI_RULES.milestonePreviousFactor:0,s.nextQueenRate,true),milestoneProgress(s.feedingRate,s.dna>0?s.previousDnaRate*UI_RULES.milestonePreviousFactor:0,s.nextDnaRate,false)];
        ['QueenTrack','DnaTrack'].forEach((name,i)=>{
            const g=this.summary.getChildByName(name)!.getComponent(Graphics)!;
            g.clear();g.fillColor=new Color(205,182,151);g.roundRect(-208,-6,416,12,5);g.fill();
            const width=Math.min(1,Math.max(0,bars[i]))*416;
            if(width>0){g.fillColor=i===0?new Color(117,147,69):new Color(148,105,174);g.rect(-208,-6,width,12);g.fill();}
        });
        if(this.tooltip?.active)this.renderDetails();
    }
    private milestoneDescription():string {
        const s=this.status;
        return `<b>进食速度：${formatOriginal(s.feedingRate)} 食物 / 分钟</b><br/>${feedingRateDescription()}<br/><br/><b>蚁后 Lv.${s.queenLevel+1} · 下一阶段 ${formatOriginal(s.nextQueenRate)}</b><br/>${queenMilestoneDescription(formatOriginal(s.nextQueenRate))}<br/><br/><b>基因：${formatOriginal(s.dna)} · 下一阶段 ${formatOriginal(s.nextDnaRate)}</b><br/>${dnaMilestoneDescription(formatOriginal(s.nextDnaRate))}`;
    }
    private statusDescription():string {
        const s=this.status;
        let text=this.milestoneDescription()+`<br/><br/><b>加成</b><br/>基础加值 +${formatOriginal(s.addend)} · 倍率 ×${s.multiplier.toFixed(1)}<br/>`+this.bonusDescription(false)+'<br/>'+this.bonusDescription(true);
        text+='<br/><br/><b>最近 60 秒的食物来源</b>';
        const foods=FOOD_ITEMS.filter(food=>(this.foodRates[food.id]||0)>0||(this.foodAmounts[food.id]||0)>0);
        if(!foods.length)text+='<br/>尚未进食，工蚁送来食物后会显示明细。';
        for(const food of foods)text+=`<br/>${tooltipIcon('source'+food.id)} <b>${FOOD_NAMES[food.id-1]}</b>：${formatOriginal(this.foodAmounts[food.id]||0)} 个 → ${formatOriginal(this.foodRates[food.id]||0)} 食物<br/>`+foodDetails(food.id,food.baseNutrition,this.tasteModel,this.goldenApples);
        text+='<br/><br/><b>当前状态</b>';
        for(const buff of RATE_BUFFS)text+=`<br/>${buff.name}：${formatOriginal(s[buff.key])} · ${this.buffActive(buff.key)?'生效中':'未激活'}`;
        return text;
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
        let text=multiplier?`每份食物的价值按当前倍率 ×${this.status.multiplier.toFixed(1)} 计算。`:`每份食物的基础价值额外增加 ${formatOriginal(this.status.addend)}。`;
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


    private showDetails(title:string,describe:()=>string):void {
        if(!this.tooltip){
            const tip=new Node('HudDetails');tip.layer=this.node.layer;this.node.parent!.addChild(tip);this.tooltip=tip;
            tip.addComponent(UITransform);tip.addComponent(Graphics);tip.addComponent(BlockInputEvents);
            tip.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{if(event.target===tip)this.hideDetails();});
            const card=this.child(tip,'Card',700,600);card.addComponent(BlockInputEvents);
            this.caption(card,'Title','',480,62,-60,240,32).isBold=true;
            const close=this.child(card,'Close',120,76,270,240);paperSurface(close,120,76,PORTRAIT.brown);
            const closeText=this.caption(close,'Label','关闭',110,60,0,0,28);closeText.color=new Color(255,245,223);
            close.addComponent(Button).transition=Button.Transition.NONE;
            close.on(Button.EventType.CLICK,()=>this.hideDetails());
            const view=this.child(card,'Viewport',652,448,0,-16);view.addComponent(Mask);
            const content=this.child(view,'Content',652,448);content.getComponent(UITransform)!.setAnchorPoint(.5,1);
            const scroll=view.addComponent(ScrollView);scroll.content=content;scroll.horizontal=false;scroll.vertical=true;
            const textNode=this.child(content,'Text',652,448);textNode.getComponent(UITransform)!.setAnchorPoint(.5,1);
            const text=textNode.addComponent(RichText);useDefaultSystemFont(text);text.fontSize=26;text.lineHeight=38;text.fontColor=PORTRAIT.ink;
            const atlas=new SpriteAtlas('HudTooltipIcons');
            atlas.spriteFrames.food=this.node.getChildByPath('Currencies/Resource0/Icon')!.getComponent(Sprite)!.spriteFrame!;
            atlas.spriteFrames.dna=this.statusRoot.getChildByPath('Progress/DnaIcon')!.getComponent(Sprite)!.spriteFrame!;
            for(const food of FOOD_ITEMS)atlas.spriteFrames['source'+food.id]=this.statusRoot.getChildByPath(`Growth/Foods/Food${food.id}/Icon`)!.getComponent(Sprite)!.spriteFrame!;
            text.imageAtlas=atlas;this.tooltipAtlas=atlas;
            this.caption(card,'Hint','上下滑动查看详细信息',620,30,0,-270,22).color=PORTRAIT.muted;
        }
        this.tooltipTitle=title;this.tooltipDescribe=describe;this.tooltipText='';
        this.tooltip.active=true;this.tooltip.setSiblingIndex(this.tooltip.parent!.children.length-1);
        this.renderDetails(true);
        this.tooltip.getChildByPath('Card/Viewport')!.getComponent(ScrollView)!.scrollToTop(0);
    }
    private renderDetails(force=false):void {
        if(!this.tooltip||!this.tooltipDescribe)return;
        const text=this.tooltipDescribe();if(!force&&text===this.tooltipText)return;this.tooltipText=text;
        const canvas=this.node.parent!.parent!.getComponent(UITransform)!;
        const tip=this.tooltip,card=tip.getChildByName('Card')!,view=card.getChildByName('Viewport')!;
        tip.getComponent(UITransform)!.setContentSize(canvas.width,canvas.height);
        const shade=tip.getComponent(Graphics)!;shade.clear();shade.fillColor=new Color(30,22,13,165);
        shade.rect(-canvas.width/2,-canvas.height/2,canvas.width,canvas.height);shade.fill();
        const width=Math.min(716,canvas.width-32),bodyWidth=width-48;
        const content=view.getChildByName('Content')!,textNode=content.getChildByName('Text')!;
        const rich=textNode.getComponent(RichText)!;rich.maxWidth=bodyWidth;rich.string=text;
        const textHeight=textNode.getComponent(UITransform)!.height;
        const height=Math.min(canvas.height-120,Math.max(300,textHeight+152)),bodyHeight=height-144;
        card.getComponent(UITransform)!.setContentSize(width,height);paperSurface(card,width,height);
        this.caption(card,'Title',this.tooltipTitle,width-200,62,-60,height/2-46,32).isBold=true;
        card.getChildByName('Close')!.setPosition(width/2-78,height/2-46);
        view.getComponent(UITransform)!.setContentSize(bodyWidth,bodyHeight);view.setPosition(0,-16);
        content.getComponent(UITransform)!.setContentSize(bodyWidth,Math.max(bodyHeight,textHeight));
        if(force)content.setPosition(0,bodyHeight/2);
        card.getChildByName('Hint')!.setPosition(0,-height/2+28);
        card.getChildByName('Hint')!.getComponent(Label)!.string=textHeight>bodyHeight?'上下滑动查看详细信息':'点击空白处或关闭返回';
    }
    private hideDetails():void {if(this.tooltip)this.tooltip.active=false;this.tooltipDescribe=null;this.tooltipText='';}
}
