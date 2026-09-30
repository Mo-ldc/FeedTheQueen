import { originalText } from '../config/OriginalText';
import { FOOD_NAMES } from '../config/FeedingRateConfig';
import { playOriginalSound } from "../core/OriginalSound";
import { isValid, Vec2 } from 'cc';
import { ECONOMY } from '../config/EconomyConfig';
import { DEBUG_RESOURCES } from '../config/DebugConfig';
import { UI_RULES } from '../config/UIConfig';
import { _decorator, Button, Color, Component, Graphics, Label, Node, ScrollView, Sprite, SpriteFrame, UITransform, UIOpacity, Tween, tween, Vec3, EventMouse, EventTouch, RichText, Widget } from 'cc';
import { gameResources as resources } from '../managers/GameBundles';
import { GENE_TAB_INDEX, UPGRADE_GROUPS } from '../config/UpgradeConfig';
import { UpgradeState, UpgradeItem } from './UpgradeState';
import { GameHUD } from './GameHUD';
import { formatOriginal } from './OriginalUIRules';
import { UpgradePanelSkin } from './UpgradePanelSkin';
import { useDefaultSystemFont } from './DefaultSystemFont';
import { colonySave } from '../core/ColonyPersistence';
import { Food } from '../core/FeedingModel';
import { createUpgradeChoice, layoutUpgradeChoiceRow, styleUpgradeChoice } from './UpgradeChoiceSkin';

const { ccclass, property } = _decorator;

/** First three upgrade groups; world controllers can subscribe to upgrade-purchased. */
@ccclass('FacilityUpgradePanel')
export class FacilityUpgradePanel extends Component {
    public initialNutrients = ECONOMY.initialResources.nutrients;
    public initialLarvae = ECONOMY.initialResources.larvae;
    private collapsed = false;
    private skin: UpgradePanelSkin;
    private hovered = '';
    private seen = new Set<string>();
    private revealed = new Set<string>();
    private hasHadBrain = false;
    private pointer: Vec3 | null = null;
    public readonly upgradeState = new UpgradeState();
    private selected = 0;
    private lastPurchaseAt = 0;
    private tooltipRow: Node | null = null;
    private debugButton: Node | null = null;
    private debugNutrientsButton: Node | null = null;
    private collapseButton: Node | null = null;
    private collapseButtonOffset = new Vec3();
    private collapseButtonScale = new Vec3(1, 1, 1);
    private zoomButtonTweens = new Map<Node, Tween<{ y: number }>>();
    private haulerPriority = 0;
    private orchardFood = Food.Apple;
    private foragerFood = Food.Blueberry;
    private farmFood = Food.Honeydew;
    public customHeaders: Record<number, () => number> = {};
    private cardRefreshElapsed = 0;
    private cardsDirty = false;
    private cardStates = new Map<Node, string>();
    private lastScrollY = NaN;

    onLoad(): void {
        this.skin = new UpgradePanelSkin(this.node);
        this.skin.build();
        this.setupCollapseButton();
        this.node.parent?.parent?.on(Node.EventType.SIZE_CHANGED, this.layoutAtBottom, this);
        this.layoutAtBottom();
        this.node.parent?.getChildByName('btn_upgrades')?.on(Button.EventType.CLICK, this.open, this);
        this.skin.tabs.forEach((tab) => {
            const index=this.skin.indexOfTab(tab);
            if(index<0)return;
            tab.on(Button.EventType.CLICK, () => { if (this.selectTab(index) && index !== GENE_TAB_INDEX) this.open(); }, this);
        });
        this.createHaulerPriorities();
        this.createFoodChoices();
        this.createSporeChoices();
        this.createThrowerPriorities();
        UPGRADE_GROUPS.forEach((group, index) => {
            const page = this.node.getChildByPath(`Pages/Page${index}`);
            if (page) page.on(ScrollView.EventType.SCROLL_BEGAN, this.hideTooltip, this);
            const content = this.node.getChildByPath(`Pages/Page${index}/Viewport/Content`);
            if (!content) return;
            group.items.forEach((item) => {
                const row = content.getChildByName(item.id);
                if (!row) return;
                const action = row.getChildByName('Action');
                if (action) {
                    action.on(Button.EventType.CLICK, () => {
                        this.hideTooltip();
                        const now = Date.now();
                        if (now - this.lastPurchaseAt < UI_RULES.purchaseDebounceMs) return;
                        this.lastPurchaseAt = now;
                        const result = this.upgradeState.purchase(item.id);
                        playOriginalSound(result === 'purchased' ? 'ui_purchase_success' : 'ui_purchase_failure');
                        if (result === 'purchased' && /Spawn|tunneller$/.test(item.id) && item.id !== 'queen_SpawnLarvae') {
                            playOriginalSound('worker_hatch');
                        }
                        if (result === 'insufficient') {
                            this.node.emit('direct-upgrade-offer', { id: item.id, title: item.title });
                        }
                        this.refresh();
                        if (result === 'purchased' && !this.collapsed) {
                            if (item.id === 'queen_BuildingForagers') this.selectTab(1);
                            if (item.id === 'queen_BuildingHaulers') this.selectTab(2);
                        }
                        if (result === 'purchased') this.emitPurchased(item.id);
                    }, this);
                }
                const tipIcon = row.getChildByName('TipIcon') || this.skin.ensureTipIcon(row);
                if (tipIcon) {
                    tipIcon.on(Button.EventType.CLICK, () => {
                        if (this.hovered === item.id && this.isTooltipActive()) {
                            this.hideTooltip();
                        } else {
                            this.hovered = item.id;
                            this.seen.add(item.id);
                            this.showTooltip(row, item.title, this.upgradeDescription(item));
                            this.refresh();
                        }
                    }, this);
                    tipIcon.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
                        event.propagationStopped = true;
                    }, this);
                    tipIcon.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
                        event.propagationStopped = true;
                    }, this);
                    tipIcon.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                        event.propagationStopped = true;
                    }, this);
                    tipIcon.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => {
                        event.propagationStopped = true;
                    }, this);
                }
            });
        });
        const tooltipNode = this.node.getChildByName('Tooltip');
        if (tooltipNode) tooltipNode.on(Node.EventType.TOUCH_END, this.hideTooltip, this);
        const bgNode = this.node.getChildByName('bg');
        if (bgNode) bgNode.on(Node.EventType.TOUCH_END, this.hideTooltip, this);
        this.upgradeState.setResources({ nutrients: this.initialNutrients, larvae: Math.floor(this.initialLarvae), greyMatter: 0 });
        const saved = colonySave.load();
        if (saved?.farm) this.farmFood = saved.farm.food;
        if (saved) { this.upgradeState.restore(saved.upgrades); this.upgradeState.queenLevel = saved.progression.queenLevel; this.orchardFood = saved.orchard?.food || Food.Apple; this.foragerFood = saved.foodWorld?.foragerFood || Food.Blueberry; }
        this.selectTab(0);
        this.refresh();
        this.setCollapsed(false, false);
        if (DEBUG_RESOURCES.enabled) {
            this.createDebugButton();
            this.createDebugNutrientsButton();
        }
    }

    onDisable(): void {
        this.hideTooltip();
    }

    private isTooltipActive(): boolean {
        const tooltip = this.node.getChildByName('Tooltip');
        return !!(tooltip && tooltip.active);
    }

    private upgradeDescription(item:UpgradeItem):string {
        let key=item.descriptionKey;
        if(item.id==='mushrooms_SpawnHandler'&&this.upgradeState.genes.secret)key='UPG_DESCRIPTION_HANDLERS_ALT';
        if(this.upgradeState.genes.deep_sea_feast&&/^UPG_DESCRIPTION_BAIT_(SARDINE|TAKO|UP_SARDINE|UP_TAKO)$/.test(key))key+='_FEAST';
        return originalText(key);
    }

    public bindOptionTip(option:Node,description:()=>string):void {
        if(option.getChildByName('OptionTip'))return;
        const tip=new Node('OptionTip');tip.layer=option.layer;option.addChild(tip);tip.addComponent(UITransform).setContentSize(32,40);tip.addComponent(Button).transition=Button.Transition.NONE;
        const art=new Node('Art');art.layer=tip.layer;tip.addChild(art);art.addComponent(UITransform).setContentSize(15,23);const sprite=art.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;
        resources.load('upgrade-skin/exclamation/spriteFrame',SpriteFrame,(error,frame)=>{if(!error&&frame&&isValid(sprite,true))sprite.spriteFrame=frame;});
        for(const type of [Node.EventType.TOUCH_START,Node.EventType.TOUCH_MOVE,Node.EventType.TOUCH_END,Node.EventType.TOUCH_CANCEL])tip.on(type,(e:EventTouch)=>{e.propagationStopped=true;});
        tip.on(Button.EventType.CLICK,()=>{if(this.tooltipRow===option&&this.isTooltipActive())this.hideTooltip();else this.showTooltip(option,'',description());});
    }

    private showTooltip(row: Node, title: string, description: string): void {
        const tooltip = this.node.getChildByName('Tooltip');
        if (!tooltip) return;
        this.tooltipRow = row;
        const titleNode = tooltip.getChildByName('Title');
        if (titleNode) titleNode.active = false;
        const descComp = tooltip.getChildByName('Description')?.getComponent(RichText);
        if (descComp) descComp.string = description;
        this.positionTooltip(row);
        tooltip.active = true;
        tooltip.setSiblingIndex(this.node.children.length - 1);
    }

    private positionTooltip(row?: Node): void {
        const targetRow = row || this.tooltipRow;
        const tooltip = this.node.getChildByName('Tooltip');
        if (!tooltip || !targetRow || !isValid(targetRow, true)) return;
        const panelTransform = this.node.getComponent(UITransform);
        if (!panelTransform) return;
        const rowPos = panelTransform.convertToNodeSpaceAR(targetRow.worldPosition);
        const tipTransform = tooltip.getComponent(UITransform);
        const tipHeight = tipTransform ? tipTransform.height : 120;

        let targetY: number;
        if (rowPos.y >= 0) {
            targetY = rowPos.y - 75 - tipHeight / 2 - 10;
        } else {
            targetY = rowPos.y + 75 + tipHeight / 2 + 10;
        }
        const minY = -240 + tipHeight / 2;
        const maxY = 240 - tipHeight / 2;
        targetY = Math.max(minY, Math.min(maxY, targetY));
        tooltip.setPosition(0, targetY, 0);
    }

    lateUpdate(dt?: number): void {
        if (!this.collapsed) this.updateVisibleCards();
        const tip = this.node.getChildByName('Tooltip');
        if (tip && tip.active && this.tooltipRow && isValid(this.tooltipRow, true)) {
            const descComp = tip.getChildByName('Description')?.getComponent(UITransform);
            const descHeight = descComp ? descComp.height : 0;
            const tipTransform = tip.getComponent(UITransform);
            if (tipTransform) {
                tipTransform.height = Math.max(90, descHeight + 28);
                this.positionTooltip(this.tooltipRow);
            }
        }
        if (this.cardsDirty && !this.collapsed) {
            this.cardRefreshElapsed += (dt !== undefined && dt > 0) ? dt : 0.016;
            if (this.cardRefreshElapsed >= 0.1) {
                this.cardRefreshElapsed = 0;
                this.cardsDirty = false;
                this.refreshVisiblePage();
            }
        }
    }

    private hideTooltip(): void {
        const wasHovered = !!this.hovered;
        this.tooltipRow = null;
        this.hovered = '';
        const tooltip = this.node.getChildByName('Tooltip');
        if (tooltip) tooltip.active = false;
        if (wasHovered) this.refresh();
    }

    onDestroy(): void {
        this.zoomButtonTweens.forEach(animation => animation.stop());
        this.zoomButtonTweens.clear();
        if (this.debugButton && isValid(this.debugButton, true)) this.debugButton.destroy();
        if(this.collapseButton&&isValid(this.collapseButton,true)){this.collapseButton.off(Button.EventType.CLICK,this.togglePanel,this);this.collapseButton.destroy();}
        this.node.parent?.parent?.off(Node.EventType.SIZE_CHANGED, this.layoutAtBottom, this);
        this.node.parent?.getChildByName('btn_upgrades')?.off(Button.EventType.CLICK, this.open, this);
    }

    private layoutAtBottom(): void { this.setCollapsed(this.collapsed, false); this.layoutDebugButton(); }

    private createDebugButton(): void {
        const button = new Node('TestResourcesButton');
        button.layer = this.node.layer;
        this.node.parent!.addChild(button);
        button.addComponent(UITransform).setContentSize(186, 54);
        const graphics = button.addComponent(Graphics);
        graphics.fillColor = new Color(96, 52, 43, 235);
        graphics.strokeColor = new Color(45, 21, 22);
        graphics.lineWidth = 3;
        graphics.roundRect(-93, -27, 186, 54, 12);
        graphics.fill(); graphics.stroke();
        const caption = new Node('Label');
        caption.layer = button.layer;
        button.addChild(caption);
        caption.addComponent(UITransform).setContentSize(178, 48);
        const label = caption.addComponent(Label);
        useDefaultSystemFont(label);
        label.string = '测试 +资源';
        label.fontSize = 25;
        label.lineHeight = 30;
        label.color = new Color(255, 243, 213);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        button.addComponent(Button);
        button.on(Button.EventType.CLICK, this.grantDebugResources, this);
        button.on(Node.EventType.TOUCH_START, (event: EventTouch) => { event.propagationStopped = true; }, this);
        button.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => { event.propagationStopped = true; }, this);
        this.debugButton = button;
        this.layoutDebugButton();
    }

    private layoutDebugButton(): void {
        const canvas = this.node.parent?.parent?.getComponent(UITransform);
        if (!canvas) return;
        if (this.debugButton) {
            this.debugButton.setPosition(canvas.width / 2 - 108, canvas.height / 2 - 144, 0);
        }
        if (this.debugNutrientsButton) {
            this.debugNutrientsButton.setPosition(canvas.width / 2 - 108, canvas.height / 2 - 208, 0);
        }
    }

    private createDebugNutrientsButton(): void {
        const button = new Node('TestNutrientsButton');
        button.layer = this.node.layer;
        this.node.parent!.addChild(button);
        button.addComponent(UITransform).setContentSize(186, 54);
        const graphics = button.addComponent(Graphics);
        graphics.fillColor = new Color(42, 92, 48, 235);
        graphics.strokeColor = new Color(22, 54, 26);
        graphics.lineWidth = 3;
        graphics.roundRect(-93, -27, 186, 54, 12);
        graphics.fill(); graphics.stroke();
        const caption = new Node('Label');
        caption.layer = button.layer;
        button.addChild(caption);
        caption.addComponent(UITransform).setContentSize(178, 48);
        const label = caption.addComponent(Label);
        useDefaultSystemFont(label);
        label.string = '测试 +10k食物';
        label.fontSize = 23;
        label.lineHeight = 30;
        label.color = new Color(220, 255, 220);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        button.addComponent(Button);
        button.on(Button.EventType.CLICK, this.grantDebugNutrients, this);
        button.on(Node.EventType.TOUCH_START, (event: EventTouch) => { event.propagationStopped = true; }, this);
        button.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => { event.propagationStopped = true; }, this);
        this.debugNutrientsButton = button;
        this.layoutDebugButton();
    }

    private grantDebugResources(): void {
        const wallet = this.upgradeState.resources;
        const gift = DEBUG_RESOURCES.perClick;
        this.setResources(wallet.nutrients + gift.nutrients,
            wallet.larvae + gift.larvae, wallet.greyMatter + gift.greyMatter);
    }

    private grantDebugNutrients(): void {
        const wallet = this.upgradeState.resources;
        this.setResources(wallet.nutrients + 10000, wallet.larvae, wallet.greyMatter);
    }

    private createHaulerPriorities(): void {
        const content = this.optionHeader(2);
        const labels = ['随机', '最近', '最小', '最大'];
        labels.forEach((text, index) => {
            const option = createUpgradeChoice(content, `Priority${index}`, text, () => this.selectHaulerPriority(index));
            option.active = false;
            this.bindOptionTip(option,()=>originalText('OPTION_CARRIER_'+['RANDOM','CLOSEST','SMALLEST','LARGEST'][index]+'_DESCRIPTION'));
        });
        this.renderHaulerPriorities();
    }

    private selectHaulerPriority(index: number): void {
        if (this.availableHaulerPriorities().indexOf(index) < 0) return;
        this.haulerPriority = [0, 1, 3, 2][index];
        this.renderHaulerPriorities();
        this.node.emit('hauler-priority-changed', this.haulerPriority);
    }

    private availableHaulerPriorities(): number[] {
        const choices: number[] = [];
        if (this.upgradeState.level('haulers_CarrierClosest') > 0 ||
            this.upgradeState.level('haulers_CarrierSmallest') > 0 || this.upgradeState.level('throwers_CarrierBiggest') > 0) choices.push(0);
        if (this.upgradeState.level('haulers_CarrierClosest') > 0) choices.push(1);
        if (this.upgradeState.level('haulers_CarrierSmallest') > 0) choices.push(2);
        if (this.upgradeState.level('throwers_CarrierBiggest') > 0) choices.push(3);
        return choices;
    }

    private renderHaulerPriorities(): void {
        const content = this.optionHeader(2);
        const choices = this.availableHaulerPriorities();
        const visible: Node[] = [];
        for (let index = 0; index < 4; index++) {
            const name = `Priority${index}`;
            const matches = content.children.filter(child => child.name === name);
            const option = matches.shift();
            matches.forEach(duplicate => {
                duplicate.active = false;
                duplicate.removeFromParent();
                duplicate.destroy();
            });
            if (!option) continue;
            const slot = choices.indexOf(index);
            option.active = slot >= 0;
            if (slot < 0) continue;
            visible.push(option);
        }
        // Reserve a clear gap for the panel's top-right collapse control.
        layoutUpgradeChoiceRow(visible, -33, 540);
        visible.forEach(option => styleUpgradeChoice(option, [0, 1, 3, 2][Number(option.name.slice(-1))] === this.haulerPriority));
    }
    private createFoodChoices(): void {
        for (const [page, foods] of [[1, [Food.Blueberry, Food.Apple, Food.Citrus]], [4, [Food.Apple, Food.Pepper, Food.Iceberry]], [5, [Food.Honeydew, Food.Sauce, Food.Meat]]] as [number, Food[]][]) {
            const content = this.optionHeader(page);
            foods.forEach(food => {
                const n = createUpgradeChoice(content, 'FoodChoice' + food, FOOD_NAMES[food-1], () => { if (page === 5) { this.farmFood = food; this.node.emit('farm-food-changed', food); } else if (page === 4) { this.orchardFood = food; this.node.emit('orchard-food-changed', food); } else this.selectForagerFood(food); this.refresh(); });
                this.bindOptionTip(n,()=>page===5?originalText('OPTION_FARM_'+({8:'HONEY',9:'HOT',10:'MEAT'} as Record<number,string>)[food]+'_DESCRIPTION'):originalText(page===1?'OPTION_FORAGERS_DESCRIPTION':'OPTION_ORCHARD_DESCRIPTION').replace('[TARGET_FOOD_NAME]',FOOD_NAMES[food-1]));
            });
        }
    }
    private createSporeChoices(): void {
        const content = this.optionHeader(6);
        ['凝神菇', '极乐菇', '繁茂菇', '澄澈菇'].forEach((name, i) => {
            const n = createUpgradeChoice(content, 'SporeChoice' + i, name, () => { if (this.upgradeState.toggleSpore(i)) { this.node.emit('spores-changed'); this.refresh(); } });
            this.bindOptionTip(n,()=>originalText('EXPLANATION_'+['FOCUS','EUPHORIA','VERDANT','CLEAR'][i])+'<br/><br/>'+originalText('EXPLANATION_SPORES')+'<br/><br/>'+originalText('EXPLANATION_CURRENT_SPORES').replace('[value]',String(Math.round(this.upgradeState.sporeEffects.efficiency*10000)/100)));
        });
        const efficiencyNodes = content.children.filter(child => child.name === 'SporeEfficiency');
        const n = efficiencyNodes.shift() || new Node('SporeEfficiency');
        efficiencyNodes.forEach(duplicate => {
            duplicate.active = false;
            duplicate.removeFromParent();
            duplicate.destroy();
        });
        n.layer = this.node.layer;
        if (n.parent !== content) content.addChild(n);
        (n.getComponent(UITransform) || n.addComponent(UITransform)).setContentSize(650, 36);
        const label = n.getComponent(Label) || n.addComponent(Label);
        useDefaultSystemFont(label);
        label.fontSize = 22;
        label.color = new Color(255, 239, 207);
        label.string = '';
    }
    private renderSporeChoices(): number {
        const content = this.optionHeader(6), effects = this.upgradeState.sporeEffects;
        const visible: Node[] = [];
        this.upgradeState.sporeUpgrades.forEach((id, i) => {
            const n = content.getChildByName('SporeChoice' + i); if (!n) return;
            n.active = this.upgradeState.level('mushrooms_' + id) > 0; if (!n.active) return;
            visible.push(n);
        });
        visible.forEach(n => {
            const i = Number(n.name.slice(-1));
            n.getChildByName('Label')!.getComponent(Label)!.string = ['凝神菇', '极乐菇', '繁茂菇', '澄澈菇'][i] + (effects.active[i] ? '：开启' : '：关闭');
        });
        layoutUpgradeChoiceRow(visible);
        visible.forEach(n => styleUpgradeChoice(n, effects.active[Number(n.name.slice(-1))]));
        const label = content.getChildByName('SporeEfficiency');
        if (label) {
            label.active = visible.length > 0;
            label.setPosition(0, -88);
            label.getComponent(Label)!.string = originalText('EXPLANATION_CURRENT_SPORES',{},false).replace('[value]',String(Math.round(effects.efficiency*10000)/100));
        }
        return visible.length ? 120 : 0;
    }
    private createThrowerPriorities(): void {
        const content = this.optionHeader(7);
        ['随机', '最近', '最大', '最小'].forEach((name, i) => {
            const n = createUpgradeChoice(content, 'ThrowerPriority' + i, name, () => { this.upgradeState.throwerPriority = i; this.refresh(); });
            this.bindOptionTip(n,()=>originalText('OPTION_CARRIER_'+['RANDOM','CLOSEST','LARGEST','SMALLEST'][i]+'_DESCRIPTION'));
        });
    }
    private renderThrowerPriorities(): number {
        const s = this.upgradeState, choices = [0, ...(s.level('haulers_CarrierClosest') ? [1] : []), ...(s.level('throwers_CarrierBiggest') ? [2] : []), ...(s.level('haulers_CarrierSmallest') ? [3] : [])];
        const content = this.optionHeader(7);
        const visible: Node[] = [];
        for (let i = 0; i < 4; i++) {
            const n = content.getChildByName('ThrowerPriority' + i)!, slot = choices.indexOf(i); n.active = slot >= 0 && choices.length > 1; if (n.active) visible.push(n);
        }
        layoutUpgradeChoiceRow(visible);
        visible.forEach(n => styleUpgradeChoice(n, s.throwerPriority === Number(n.name.slice(-1))));
        return visible.length ? 72 : 0;
    }
    private renderFoodChoices(page: number): number {
        if (page === 7) return this.renderThrowerPriorities();
        if (page === 6) return this.renderSporeChoices();
        if (page !== 1 && page !== 4 && page !== 5) return 0;
        const content = this.optionHeader(page);
        const selected = page === 5 ? this.farmFood : page === 4 ? this.orchardFood : this.foragerFood;
        const choices = page === 5 ? [Food.Honeydew, ...(this.upgradeState.level('farm_FireBugs') ? [Food.Sauce] : []), ...(this.upgradeState.level('farm_MeatBugs') ? [Food.Meat] : [])] : page === 1 ? [Food.Blueberry, ...(this.upgradeState.level('foragers_ApplesForaging') ? [Food.Apple] : []), ...(this.upgradeState.level('foragers_CitrusForaging') ? [Food.Citrus] : [])] :
            [Food.Apple, ...(this.upgradeState.level('orchard_ScorchFruits') ? [Food.Pepper] : []), ...(this.upgradeState.level('orchard_IceBerries') ? [Food.Iceberry] : [])];
        const visible: Node[] = [];
        for (const n of content.children.filter(n => n.name.startsWith('FoodChoice'))) {
            const food = Number(n.name.replace('FoodChoice', '')), slot = choices.indexOf(food);
            n.active = slot >= 0 && choices.length > 1;
            if (!n.active) continue;
            visible.push(n);
        }
        layoutUpgradeChoiceRow(visible);
        visible.forEach(n => styleUpgradeChoice(n, selected === Number(n.name.replace('FoodChoice', ''))));
        return visible.length ? 72 : 0;
    }

    /** Option controls stay pinned above the clipped scrolling list. */
    public optionHeader(page: number): Node {
        const viewport = this.node.getChildByPath(`Pages/Page${page}/Viewport`)!;
        const pageNode = this.node.getChildByPath(`Pages/Page${page}`)!;
        const headers = [...pageNode.children, ...viewport.children].filter(child => child.name === 'OptionHeader');
        let header = pageNode.getChildByName('OptionHeader') || viewport.getChildByName('OptionHeader');
        headers.filter(candidate => candidate !== header).forEach(duplicate => {
            duplicate.active = false;
            duplicate.removeFromParent();
            duplicate.destroy();
        });
        if (!header) {
            header = new Node('OptionHeader');
            header.layer = pageNode.layer;
            pageNode.addChild(header);
            header.addComponent(UITransform);
        }
        if (header.parent !== pageNode) header.setParent(pageNode);
        header.getComponent(UITransform)!.setContentSize(680, UpgradePanelSkin.viewportHeight);
        header.setPosition(0, UpgradePanelSkin.viewportHeight / 2);
        header.setSiblingIndex(pageNode.children.length - 1);
        return header;
    }
    public open(): void { this.setCollapsed(false, true); }
    public close(animate = true): void { this.setCollapsed(true, typeof animate === 'boolean' ? animate : true); }
    private setupCollapseButton():void {
        const ui=this.node.parent;
        if(!ui)return;
        const button=this.node.getChildByName('btn_close')||ui.getChildByName('btn_close');
        if(!button)return;
        this.collapseButton=button;
        this.collapseButtonScale=button.scale.clone();
        const panelSize=this.node.getComponent(UITransform);
        const buttonSize=button.getComponent(UITransform);
        const panelWidth=panelSize?.width||UpgradePanelSkin.width;
        const panelHeight=panelSize?.height||UpgradePanelSkin.height;
        const buttonWidth=(buttonSize?.width||64)*Math.abs(this.collapseButtonScale.x);
        const buttonHeight=(buttonSize?.height||64)*Math.abs(this.collapseButtonScale.y);
        const edgeOverlap=2;
        this.collapseButtonOffset.set(
            panelWidth/2-buttonWidth/2+edgeOverlap,
            panelHeight/2+buttonHeight/2-edgeOverlap,
            0,
        );
        if(button.parent!==ui){button.removeFromParent();ui.addChild(button);}
        // Keep the handle behind the panel so it peeks out from its upper-right corner.
        button.setSiblingIndex(this.node.getSiblingIndex());
        const control=button.getComponent(Button)||button.addComponent(Button);
        control.transition=Button.Transition.NONE;
        button.off(Button.EventType.CLICK);
        button.on(Button.EventType.CLICK,this.togglePanel,this);
    }
    private togglePanel():void { if(this.collapsed)this.open();else this.close(); }
    private layoutCollapseButton(scale:number,panelPosition:Vec3,animate:boolean):void {
        const button=this.collapseButton;
        if(!button||!isValid(button,true))return;
        const x=panelPosition.x+this.collapseButtonOffset.x*scale;
        const y=panelPosition.y+this.collapseButtonOffset.y*scale;
        const position=new Vec3(x,y,panelPosition.z+this.collapseButtonOffset.z*scale);
        const direction=this.collapsed?-1:1;
        button.active=true;
        button.angle = 0;
        button.setScale(Math.abs(this.collapseButtonScale.x)*scale,Math.abs(this.collapseButtonScale.y)*scale*direction,this.collapseButtonScale.z);
        Tween.stopAllByTarget(button);
        if(animate)tween(button).to(UI_RULES.panelSlideSeconds,{position},{easing:'quadOut'}).start();
        else button.setPosition(position);
    }
    private setCollapsed(collapsed: boolean, animate: boolean): void {
        this.collapsed = collapsed; this.hideTooltip();
        this.node.active = true;
        const upgradeButton=this.node.parent?.getChildByName('btn_upgrades');
        if(upgradeButton)upgradeButton.active=!this.collapseButton&&collapsed;
        const canvas = this.node.parent?.parent?.getComponent(UITransform);
        if(!canvas)return;
        const scale = Math.min(1, (canvas.width - 16) / UpgradePanelSkin.width);
        this.node.setScale(scale, scale, 1);
        const position = new Vec3(0, -canvas.height / 2 + (collapsed ? -UpgradePanelSkin.height / 2 + 4 : UpgradePanelSkin.height / 2 + 8) * scale, 0);
        this.layoutZoomButtons(scale, position, animate);
        Tween.stopAllByTarget(this.node);
        const pages = this.node.getChildByName('Pages');
        // Zero opacity skips this entire render subtree without rebuilding every
        // Label/Mask/Button through an onDisable/onEnable cycle on every reopen.
        const pageOpacity = pages && (pages.getComponent(UIOpacity) || pages.addComponent(UIOpacity));
        if (!collapsed && pageOpacity) pageOpacity.opacity = 255;
        const finish = () => { if (this.collapsed && pageOpacity && isValid(pageOpacity, true)) pageOpacity.opacity = 0; };
        if (animate) tween(this.node).to(UI_RULES.panelSlideSeconds, { position }, { easing: 'quadOut' }).call(finish).start();
        else { this.node.setPosition(position); finish(); }
        this.layoutCollapseButton(scale,position,animate);
        if (!collapsed) {
            this.cardsDirty = false;
            this.cardRefreshElapsed = 0;
            this.refreshVisiblePage();
        }
    }

    private layoutZoomButtons(scale: number, panelPosition: Vec3, animate: boolean): void {
        const tabs = this.node.getChildByName('TabScroll');
        const tabSize = tabs?.getComponent(UITransform);
        const top = Math.max(UpgradePanelSkin.height / 2,
            tabs && tabSize ? tabs.position.y + tabSize.height * (1 - tabSize.anchorY) * Math.abs(tabs.scale.y) : 0);
        for (const name of ['add', 'sub']) {
            const button = this.node.parent?.getChildByName(name);
            const size = button?.getComponent(UITransform);
            if (!button || !size) continue;
            // Only Y follows the panel. Keep authored horizontal alignment and size.
            const widget = button.getComponent(Widget);
            if (widget) {
                widget.isAlignTop = false;
                widget.isAlignBottom = false;
                widget.isAlignVerticalCenter = false;
            }
            this.zoomButtonTweens.get(button)?.stop();
            this.zoomButtonTweens.delete(button);
            const y = panelPosition.y + (top + 12) * scale + size.height * size.anchorY * Math.abs(button.scale.y);
            const state = { y: button.position.y };
            const apply = () => { if (isValid(button, true)) button.setPosition(button.position.x, state.y, button.position.z); };
            if (animate) {
                const animation = tween(state).to(UI_RULES.panelSlideSeconds, { y }, { easing: 'quadOut', onUpdate: apply })
                    .call(() => { state.y = y; apply(); this.zoomButtonTweens.delete(button); }).start();
                this.zoomButtonTweens.set(button, animation);
            } else { state.y = y; apply(); }
        }
    }

    /** World building taps reveal their tab; direct tab taps keep the strip in place. */
    public openBuildingTab(index: number): boolean {
        if (!this.selectTab(index)) return false;
        if (index === GENE_TAB_INDEX) return true;
        this.open();
        const scroll = this.node.getChildByName('TabScroll')?.getComponent(ScrollView);
        const tab = this.skin.tabNode(index)?.getComponent(UITransform);
        const view = scroll?.view;
        if (!scroll || !tab || !view) return true;
        // Use actual transforms after layout, including hidden groups and authored widths.
        const center = view.convertToNodeSpaceAR(tab.convertToWorldSpaceAR(new Vec3(
            (0.5 - tab.anchorX) * tab.width, (0.5 - tab.anchorY) * tab.height, 0)));
        const offset = scroll.getScrollOffset();
        // Cocos returns a negative X for getScrollOffset, but accepts positive X in scrollToOffset.
        const x = -offset.x + center.x - (0.5 - view.anchorX) * view.width;
        scroll.scrollToOffset(new Vec2(Math.max(0, Math.min(scroll.getMaxScrollOffset().x, x)), offset.y), 0.2);
        return true;
    }

    public selectTab(index: number): boolean {
        if (index < 0 || index >= UPGRADE_GROUPS.length || !this.upgradeState.groupUnlocked(index)) return false;
        this.node.getChildByName('TabScroll')?.getComponent(ScrollView)?.stopAutoScroll();
        if (index === GENE_TAB_INDEX) { this.hideTooltip(); this.selected = GENE_TAB_INDEX; this.node.emit('tab-selected', GENE_TAB_INDEX); this.node.emit('gene-panel-open'); this.close(); return true; }
        this.hideTooltip();
        this.selected = index; this.node.emit("tab-selected", index);
        this.lastScrollY = NaN;
        this.skin.loadPageIcons(index);
        this.node.getChildByName('Pages')?.children.forEach((page, i) => {
            page.active = i === index;
            if (page.active) page.getComponent(ScrollView)?.scrollToTop(0);
        });
        this.skin.tabs.forEach((tab) => {
            const tabIndex=this.skin.indexOfTab(tab);
            if(tabIndex<0)return;
            // Tab skins may draw on a child Sprite instead of the tab root.
            this.skin.tab(tabIndex, tabIndex === index, this.upgradeState.groupUnlocked(tabIndex));
        });
        this.skin.layoutTabs();
        this.refreshPage(index);
        const title=this.node.getChildByName('Title')?.getComponent(Label);
        if(title)title.string=UPGRADE_GROUPS[index].title;
        this.setHint(UPGRADE_GROUPS[this.selected].hint);
        return true;
    }

    public selectForagerFood(food: Food): void {
        const unlocked = food === Food.Blueberry || food === Food.Apple && !!this.upgradeState.level('foragers_ApplesForaging') || food === Food.Citrus && !!this.upgradeState.level('foragers_CitrusForaging');
        if (!unlocked || this.foragerFood === food) return;
        this.foragerFood = food;
        this.node.emit('forager-food-changed', food);
        this.refresh();
    }

    /** Supply the authoritative balance when feeding/resource generation is connected. */
    public setResources(nutrients: number, larvae: number, greyMatter: number): void {
        this.upgradeState.setResources({ nutrients, larvae, greyMatter });
        const wallet = this.upgradeState.resources;
        this.hasHadBrain ||= wallet.greyMatter > 0 || this.upgradeState.hasHadBrain;
        const hud = this.node.parent?.getChildByName('GameHUD')?.getComponent(GameHUD);
        hud?.setResources(wallet);
        this.node.emit('resources-changed', wallet);
        hud?.setProgression(this.upgradeState.level('queen_BuildingEvolutionChamber') > 0, 1, this.hasHadBrain);
        this.cardsDirty = true;
    }

    /** Complete a rewarded direct upgrade through the same refresh/event path as a normal purchase. */
    public purchaseFreeLevel(id: string): boolean {
        const result = this.upgradeState.purchaseFree(id);
        if (result !== 'purchased') return false;
        playOriginalSound('ui_purchase_success');
        if (/Spawn|tunneller$/.test(id) && id !== 'queen_SpawnLarvae') playOriginalSound('worker_hatch');
        this.refresh();
        this.emitPurchased(id);
        return true;
    }

    private emitPurchased(id: string): void {
        this.node.emit('upgrade-purchased', {
            id, level: this.upgradeState.level(id),
            resources: this.upgradeState.resources, effects: this.upgradeState.effects,
        });
    }

    private format(value: number): string { return formatOriginal(value); }

    public refreshVisiblePage(): void {
        if (this.collapsed) return;
        const tabs = this.skin.tabs;
        tabs.forEach(tab => {
            const index = this.skin.indexOfTab(tab);
            if (index >= 0) this.skin.tab(index, index === this.selected, this.upgradeState.groupUnlocked(index));
        });
        this.skin.layoutTabs();
        this.refreshPage(this.selected);
    }

    public refresh(): void {
        const wallet = this.upgradeState.resources;
        this.hasHadBrain ||= wallet.greyMatter > 0 || this.upgradeState.hasHadBrain;
        const hud = this.node.parent?.getChildByName('GameHUD')?.getComponent(GameHUD);
        hud?.setResources(wallet);
        this.node.emit('resources-changed', wallet);
        hud?.setProgression(this.upgradeState.level('queen_BuildingEvolutionChamber') > 0, 1, this.hasHadBrain);
        const resources = this.node.getChildByName('Resources');
        if (resources) resources.active = false;
        const hint = this.node.getChildByName('Hint');
        if (hint) hint.active = false;
        if (this.collapsed) {
            this.cardsDirty = true;
            return;
        }
        this.refreshVisiblePage();
    }

    public refreshPage(index: number): void {
        if (index === 2) this.renderHaulerPriorities();
        const group = UPGRADE_GROUPS[index];
        if (!group) return;
        const content = this.node.getChildByPath(`Pages/Page${index}/Viewport/Content`);
        if (!content) return;
        const optionHeight = this.customHeaders[index]?.() ?? (index === 2 && this.availableHaulerPriorities().length > 0 ? 72 : this.renderFoodChoices(index));
        const viewportHeight = this.skin.setOptionHeaderSpace(index, optionHeight);
        let visibleRows = 0;
        group.items.forEach(item => {
            const row = content.getChildByName(item.id);
            if (!row) return;
            const unlocked = this.upgradeState.isUnlocked(item);
            const maxed = this.upgradeState.isMaxed(item);
            if (unlocked && (!item.greyMatter || this.hasHadBrain)) this.revealed.add(item.id);
            if (!this.revealed.has(item.id)) { row.active = false; return; }
            const slot = visibleRows++;
            const level = this.upgradeState.level(item.id);
            const cost = this.upgradeState.cost(item);
            const affordable = unlocked && this.upgradeState.canAfford(item);
            const hovered = this.hovered === item.id;
            const state = `${slot}|${level}|${unlocked}|${maxed}|${affordable}|${hovered}|${this.seen.has(item.id)}|${cost.nutrients}|${cost.larvae}|${cost.greyMatter}`;
            if (this.cardStates.get(row) === state) return;
            this.cardStates.set(row, state);

            const rowSprite = row.getComponent(Sprite);
            if (rowSprite) rowSprite.color = this.hovered === item.id
                ? (maxed ? new Color(117, 70, 58) : this.upgradeState.canAfford(item) ? new Color(0, 252, 85) : new Color(255, 71, 77))
                : maxed ? new Color(192, 129, 98) : new Color(253, 222, 182);
            const mark = row.getChildByName('New');
            if (mark) mark.active = !this.seen.has(item.id) && this.upgradeState.level(item.id) === 0;
            const levelNode = row.getChildByName('Level');
            const levelLabel = levelNode?.getComponent(Label);
            if (levelLabel) levelLabel.string = String(level);
            if (levelNode) levelNode.active = true;
            const columnRule = row.getChildByName('ColumnRule67');
            if (columnRule) columnRule.active = false;
            const status = row.getChildByName('Status');
            if (status) status.active = maxed || !unlocked;
            const statusLabel = status?.getComponent(Label);
            if (statusLabel) statusLabel.string = maxed ? '已满级' : '未解锁';
            [cost.nutrients, cost.larvae, cost.greyMatter].forEach((value, k) => {
                const label = row.getChildByName(`Cost${k}`);
                const icon = row.getChildByName(`CostIcon${k}`);
                if (label) { label.active = !status?.active && value > 0; const costLabel = label.getComponent(Label); if (costLabel) costLabel.string = this.format(value); }
                if (icon) icon.active = !status?.active && value > 0;
            });
            if (row.getComponent(UITransform)) this.skin.card(row, slot, 0, level, maxed, affordable, hovered, unlocked && !maxed && !affordable);
        });
        const contentTransform = content.getComponent(UITransform);
        if (contentTransform) contentTransform.height = Math.max(viewportHeight, Math.ceil(visibleRows / 2) * 162);
        this.lastScrollY = NaN;
        if (index === this.selected) this.updateVisibleCards();
    }

    /** The mask clips pixels, but does not stop offscreen card labels from rendering. */
    private updateVisibleCards(): void {
        const viewport = this.node.getChildByPath(`Pages/Page${this.selected}/Viewport`);
        const content = viewport?.getChildByName('Content');
        const transform = viewport?.getComponent(UITransform);
        if (!content || !transform || this.lastScrollY === content.position.y) return;
        this.lastScrollY = content.position.y;
        const halfHeight = transform.height / 2;
        for (const row of content.children) {
            if (!this.revealed.has(row.name)) { row.active = false; continue; }
            const y = row.position.y + content.position.y;
            // Include the full row and a small buffer so dragging never exposes an empty edge.
            row.active = y + 85 >= -halfHeight && y - 85 <= halfHeight;
        }
    }

    private setHint(text: string): void {
        const hint=this.node.getChildByName('Hint')?.getComponent(Label);
        if(hint)hint.string=text;
    }
}
