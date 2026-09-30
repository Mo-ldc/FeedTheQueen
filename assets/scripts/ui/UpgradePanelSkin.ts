import { layoutUpgradeCosts } from './UpgradeCostLayout';
import { assetManager, Button, Color, Graphics, Label, Layout, Node, RichText, Sprite, SpriteFrame, UITransform, isValid, instantiate } from 'cc';
import { gameResources as resources } from '../managers/GameBundles';
import { UPGRADE_GROUPS, TAB_ORDER } from '../config/UpgradeConfig';
import { UPGRADE_ART } from '../config/UpgradeArtConfig';
import { useDefaultSystemFont } from './DefaultSystemFont';
import { upgradeCountCaption } from './UpgradeCardText';

/** Reference-inspired dock. Only presentation is changed; purchase rules stay in UpgradeState. */
export class UpgradePanelSkin {
    static readonly width = 720;
    static readonly height = 500;
    static readonly viewportHeight = 460;
    private static readonly iconBoxSize = 88;
    private readonly optionHeaderSpaces = new Map<number, number>();
    private static readonly TIP_ICON_UUID = 'd217d682-0367-41eb-bf29-50f4e40b8801@f9941';
    private readonly ink = new Color(79, 49, 29);
    private badgeFrame: SpriteFrame | null = null;
    private tipFrame: SpriteFrame | null = null;
    private readonly loadedIconPages = new Set<number>();
    private readonly tabOutlineWidths = new WeakMap<Label, number>();
    constructor(private panel: Node) {}

    /** Clip the list below its pinned option controls while keeping the panel's bottom edge fixed. */
    setOptionHeaderSpace(page: number, requestedHeight: number): number {
        const pageNode = this.panel.getChildByName('Pages')?.getChildByName(`Page${page}`);
        const viewport = pageNode?.getChildByName('Viewport');
        const transform = viewport?.getComponent(UITransform);
        if (!pageNode || !viewport || !transform) return UpgradePanelSkin.viewportHeight;

        const space = Math.max(0, Math.min(UpgradePanelSkin.viewportHeight - 1, requestedHeight));
        const previous = this.optionHeaderSpaces.get(page) || 0;
        const delta = space - previous;
        const visibleHeight = UpgradePanelSkin.viewportHeight - space;
        if (delta !== 0 || transform.height !== visibleHeight) {
            transform.setContentSize(680, visibleHeight);
            viewport.setPosition(0, -space / 2, viewport.position.z);
            const content = viewport.getChildByName('Content');
            if (content && delta !== 0) content.setPosition(content.position.x, content.position.y - delta / 2, content.position.z);
            this.optionHeaderSpaces.set(page, space);
        }
        return visibleHeight;
    }

    private box(node: Node, w: number, h: number, fill: Color, border: Color, radius = 22): Graphics {
        const sprite = node.getComponent(Sprite);
        if (sprite) sprite.enabled = false;
        const transform = node.getComponent(UITransform) || node.addComponent(UITransform);
        transform.setContentSize(w, h);
        const surface = sprite ? this.child(node, 'SkinSurface', w, h, 0, 0) : node;
        if (sprite) surface.setSiblingIndex(0);
        const g = surface.getComponent(Graphics) || surface.addComponent(Graphics);
        g.clear(); g.lineWidth = 4; g.strokeColor = border; g.fillColor = fill;
        g.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, radius); g.fill(); g.stroke();
        return g;
    }

    private child(parent: Node, name: string, w: number, h: number, x: number, y: number): Node {
        let n = parent.getChildByName(name);
        if (!n) { n = new Node(name); n.layer = parent.layer; parent.addChild(n); n.addComponent(UITransform); }
        n.getComponent(UITransform)!.setContentSize(w, h); n.setPosition(x, y); return n;
    }

    private fitIcon(node: Node, frame: SpriteFrame): void {
        const size = UpgradePanelSkin.iconBoxSize;
        const scale = Math.min(size / frame.originalSize.width, size / frame.originalSize.height);
        node.getComponent(UITransform)!.setContentSize(frame.originalSize);
        node.setScale(scale, scale, 1);
    }

    private label(parent: Node, name: string, text: string, w: number, h: number, x: number, y: number, size: number): Label {
        const n = this.child(parent, name, w, h, x, y);
        const l = n.getComponent(Label) || n.addComponent(Label);
        useDefaultSystemFont(l);
        l.string = text; l.fontSize = size; l.lineHeight = size + 5; l.color = this.ink;
        l.isBold = true; l.horizontalAlign = Label.HorizontalAlign.CENTER;
        l.verticalAlign = Label.VerticalAlign.CENTER; l.overflow = Label.Overflow.SHRINK;
        l.enableWrapText = false; return l;
    }

    public get tabs(): Node[] {
        const root = this.tabRoot();
        return root ? root.children.filter(tab => /^Tab\d+$/.test(tab.name)).sort((a,b)=>this.indexOfTab(a)-this.indexOfTab(b)) : [];
    }

    private tabRoot():Node|null {
        return this.panel.getChildByPath('TabScroll/Viewport/tab') || this.panel.getChildByName('tab');
    }

    public tabNode(index:number):Node|null {
        return this.tabRoot()?.getChildByName(`Tab${index}`) || null;
    }

    public indexOfTab(tab:Node):number {
        const match=/^Tab(\d+)$/.exec(tab.name);
        return match ? Number(match[1]) : -1;
    }

    build(): void {
        this.extendContent();
        for (const label of this.panel.getComponentsInChildren(Label)) label.cacheMode = Label.CacheMode.NONE;
        for (const richText of this.panel.getComponentsInChildren(RichText)) richText.cacheMode = Label.CacheMode.NONE;
        this.loadAdBadge();
        this.loadTipIcon();
        const baked = !!this.panel.getChildByName('BakedUpgradeSkin');
        this.panel.getComponent(UITransform)!.setContentSize(UpgradePanelSkin.width, UpgradePanelSkin.height);
        const background = this.panel.getChildByName('bg');
        if (background) {
            if (baked) {
                background.getComponent(UITransform)?.setContentSize(UpgradePanelSkin.width, UpgradePanelSkin.height);
                const surface = background.getChildByName('SkinSurface');
                surface?.getComponent(UITransform)?.setContentSize(UpgradePanelSkin.width, UpgradePanelSkin.height);
                const sprite = surface?.getComponent(Sprite) || background.getComponent(Sprite);
                if (sprite) sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            } else {
                this.box(background, UpgradePanelSkin.width, UpgradePanelSkin.height, new Color(88, 64, 44), new Color(172, 126, 87), 26);
            }
        }
        const tabScroll = this.panel.getChildByName('TabScroll');
        if (tabScroll) {
            const pos = tabScroll.position;
            tabScroll.setPosition(pos.x, UpgradePanelSkin.height / 2 + 4.5, pos.z);
        }
        const close = this.panel.getChildByName('btn_close');
        if (baked && close) close.setPosition(330, UpgradePanelSkin.height / 2 + 31, close.position.z);
        const pages = this.panel.getChildByName('Pages')!;
        pages.setPosition(0, -10);
        pages.getComponent(UITransform)!.setContentSize(680, UpgradePanelSkin.viewportHeight);
        pages.children.forEach(page => {
            page.getComponent(UITransform)!.setContentSize(680, UpgradePanelSkin.viewportHeight);
            const viewport = page.getChildByName('Viewport')!;
            viewport.getComponent(UITransform)!.setContentSize(680, UpgradePanelSkin.viewportHeight);
            const content = viewport.getChildByName('Content')!;
            content.setPosition(0, UpgradePanelSkin.viewportHeight / 2);
            content.getComponent(UITransform)!.width = 680;
        });
        // The authored scene already contains these nodes and Sprite frames.
        if (baked) {
            pages.children.forEach(page => {
                const content = page.getChildByPath('Viewport/Content');
                if (!content) return;
                content.children.filter(row => !row.name.startsWith('Priority')).forEach(row => {
                    this.ensureTipIcon(row);
                });
            });
            return;
        }
        for (const name of ['Header', 'Title', 'Resources', 'Hint']) this.panel.getChildByName(name)!.active = false;
        const tabs = this.panel.getChildByName('tab')!;
        tabs.setPosition(0, 0); tabs.setSiblingIndex(0);
        tabs.children.forEach((tab, i) => {
            const slot = i;
            tab.setPosition(-222 + slot * 222, UpgradePanelSkin.height / 2 + 21);
            tab.getChildByName('Icon')!.active = false;
            tab.getChildByName('Selected')!.active = false;
            tab.getComponent(Button)!.transition = Button.Transition.NONE;
            const caption = this.label(tab, 'Label', ['蚁后', '觅食者', '搬运工'][i], 192, 52, 0, 5, 36);
            caption.enableOutline = true; caption.outlineColor = this.ink; caption.outlineWidth = 2;
        });
        close!.setPosition(330, UpgradePanelSkin.height / 2 - 22);
        this.box(close!, 38, 32, new Color(119, 88, 59), new Color(188, 143, 96), 9);
        this.label(close!, 'Label', '⌄', 30, 28, 0, 2, 25);
        pages.children.forEach(page => {
            const viewport = page.getChildByName('Viewport')!;
            const content = viewport.getChildByName('Content')!;
            content.children.filter(row => !row.name.startsWith('Priority')).forEach(row => {
                const name = row.getChildByName('Name')!.getComponent(Label)!.string;
                this.child(row, 'Action', 326, 150, 0, 0);
                row.getChildByName('New')!.active = false;
                row.getChildByName('ColumnRule1')!.active = false;
                row.getChildByName('ColumnRule67')!.active = false;
                const pill = this.child(row, 'TitlePill', 164, 44, 64, 37);
                this.box(pill, 164, 44, new Color(240, 180, 124), new Color(240, 180, 124), 12);
                pill.setSiblingIndex(0);
                const title = this.label(row, 'Name', name, 158, 42, 64, 37, 29);
                title.enableOutline = true; title.outlineColor = this.ink; title.outlineWidth = 0.6;
                this.label(row, 'CountCaption', upgradeCountCaption(row.name), 106, 26, -91, -51, 19);
                const art = this.child(row, 'Illustration', 120, 65, -94, 37);
                const s = art.addComponent(Sprite); s.sizeMode = Sprite.SizeMode.RAW;
                this.ensureTipIcon(row);
                row.getChildByName('Action')!.setSiblingIndex(row.children.length - 1);
                row.getChildByName('TipIcon')!.setSiblingIndex(row.children.length - 1);
            });
        });
    }

    /** Extend the authored dock using its own card and tab assets. */
    private extendContent():void {
        const pages=this.panel.getChildByName('Pages');
        const tabRoot=this.tabRoot();
        const firstPage=pages?.children[0];
        const template=firstPage?.getChildByPath('Viewport/Content')?.children[0];
        if(!pages||!tabRoot||!firstPage||!template)return;
        UPGRADE_GROUPS.forEach((group,index)=>{
            let page=pages.getChildByName('Page'+index);
            if(!page){
                page=instantiate(pages.children[0]);page.name='Page'+index;pages.addChild(page);page.active=false;
                const content=page.getChildByPath('Viewport/Content')!;
                for(const n of [...content.children]){n.removeFromParent();n.destroy();}
            }
            let tab=tabRoot.getChildByName('Tab'+index);
            if(!tab){tab=instantiate(tabRoot.children[0]);tab.name='Tab'+index;tabRoot.addChild(tab);}
            tab.setPosition(118+222*index,0);
            tab.getChildByName('Label')!.getComponent(Label)!.string=group.title;
            const content=page.getChildByPath('Viewport/Content')!;
            for (const item of group.items) {
                const row = content.getChildByName(item.id);
                if (row) {
                    row.getChildByName('Name')!.getComponent(Label)!.string=item.title;
                    this.ensureAdBadge(row);
                    this.ensureTipIcon(row);
                }
            }
            for(const item of group.items){
                if(content.getChildByName(item.id))continue;
                const row=instantiate(template);row.name=item.id;content.addChild(row);
                this.ensureAdBadge(row);
                this.ensureTipIcon(row);
                row.getChildByName('Name')!.getComponent(Label)!.string=item.title;
                const art=row.getChildByName('Illustration')?.getComponent(Sprite);
                if(art){
                    art.spriteFrame=null;
                    art.sizeMode=Sprite.SizeMode.RAW;
                }
            }
        });
        tabRoot.getComponent(UITransform)!.width=UPGRADE_GROUPS.length*222+14;
    }

    /** Load artwork only for the page the player is viewing. */
    loadPageIcons(index:number):void {
        if(this.loadedIconPages.has(index))return;
        this.loadedIconPages.add(index);
        const page=this.panel.getChildByName('Pages')?.getChildByName('Page'+index);
        if(!page)return;
        for(const item of UPGRADE_GROUPS[index]?.items||[]){
            const art=page.getChildByPath(`Viewport/Content/${item.id}/Illustration`)?.getComponent(Sprite);
            if(!art)continue;
            const path=UPGRADE_ART[item.id]||UPGRADE_ART.queen_BuildingEvolutionChamber;
            resources.load(path+'/spriteFrame',SpriteFrame,(error,frame)=>{
                if(!isValid(art,true))return;
                if(error||!frame){this.loadedIconPages.delete(index);console.warn('Upgrade icon unavailable: '+item.id);return;}
                art.spriteFrame=frame;
                this.fitIcon(art.node,frame);
            });
        }
    }

    private ensureAdBadge(row: Node): Node {
        let badge = row.getChildByName('AdBadge');
        if (!badge) {
            badge = new Node('AdBadge'); badge.layer = row.layer; row.addChild(badge);
        }
        badge.setPosition(-52, 37, 0);
        (badge.getComponent(UITransform) || badge.addComponent(UITransform)).setContentSize(26, 20);
        const sprite = badge.getComponent(Sprite) || badge.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        if (this.badgeFrame) badge.getComponent(Sprite)!.spriteFrame = this.badgeFrame;
        return badge;
    }

    private loadAdBadge(): void {
        resources.load('upgrade-skin/watch_ad_badge/spriteFrame', SpriteFrame, (error, frame) => {
            if (error || !frame) { console.warn('[UpgradePanelSkin] Ad badge resource could not be loaded.'); return; }
            this.badgeFrame = frame;
            for (const group of UPGRADE_GROUPS) for (const item of group.items) {
                const row = this.panel.getChildByPath(`Pages/Page${UPGRADE_GROUPS.indexOf(group)}/Viewport/Content/${item.id}`);
                if (row) this.ensureAdBadge(row).getComponent(Sprite)!.spriteFrame = frame;
            }
        });
    }

    /** Hidden groups keep their indices for click bindings but occupy no list space. */
    layoutTabs(): void {
        const tabs=this.tabs;
        const root=this.tabRoot();
        if(!root)return;
        TAB_ORDER.forEach((id,slot)=>this.tabNode(id)?.setSiblingIndex(slot));
        const layout = root.getComponent(Layout);
        if (layout?.enabled) {
            layout.updateLayout();
            return;
        }
        const visible = root.children.filter(tab => tab.active);
        const viewport = this.panel.getChildByPath('TabScroll/Viewport');
        visible.forEach((tab, slot) => tab.setPosition(viewport ? 118 + 222 * slot : -222 + 222 * slot, viewport ? 0 : 206));
        const transform=root.getComponent(UITransform);
        if(transform)transform.width = Math.max(
            viewport?.getComponent(UITransform)?.width || 0, visible.length * 222 + 14);
    }

    tab(index: number, selected: boolean, unlocked: boolean): void {
        const tab = this.tabNode(index);
        if(!tab)return;
        tab.active = unlocked;
        if (!unlocked) return;
        const caption = tab.getChildByName('Label')?.getComponent(Label);
        if (caption) {
            if (!this.tabOutlineWidths.has(caption)) this.tabOutlineWidths.set(caption, caption.outlineWidth + 1);
            caption.outlineWidth = this.tabOutlineWidths.get(caption)!;
        }
        const baked = this.panel.getChildByName('BakedUpgradeSkin');
        if (baked) {
            const surface=tab.getChildByName('SkinSurface')?.getComponent(Sprite);
            const frame=baked.getChildByName(selected ? 'tab-selected' : 'tab-idle')?.getComponent(Sprite)?.spriteFrame;
            if(surface&&frame)surface.spriteFrame=frame;
            const caption=tab.getChildByName('Label')?.getComponent(Label);
            if(caption){caption.color=new Color(255,248,227);caption.enableOutline=true;}
            return;
        }
        this.box(tab, 212, 72, selected ? new Color(255, 231, 189) : new Color(177, 136, 91), new Color(112, 77, 43), 26);
        const selectedMark=tab.getChildByName('Selected');
        if(selectedMark)selectedMark.active=false;
        const label=tab.getChildByName('Label')?.getComponent(Label);
        if(label){label.color=new Color(255,248,227);label.enableOutline=true;}
    }

    card(row: Node, slot: number, top: number, level: number, maxed: boolean, affordable: boolean, hovered: boolean, adEligible: boolean): void {
        this.label(row, 'CountCaption', upgradeCountCaption(row.name, maxed), 106, 26, -91, -51, 19);
        layoutUpgradeCosts(row);
        row.setPosition(slot % 2 === 0 ? -173 : 173, -77 - Math.floor(slot / 2) * 162 - top);
        const adBadge = row.getChildByName('AdBadge');
        if (adBadge) {
            adBadge.active = adEligible;
            if (adEligible) adBadge.setSiblingIndex(row.children.length - 1);
        }
        if (this.panel.getChildByName('BakedUpgradeSkin')) {
            row.getChildByName('New')!.active = false;
            row.getChildByName('ColumnRule67')!.active = false;
            const count = row.getChildByName('Level')!;
            count.active = true; count.getComponent(Label)!.string = String(level);
            const shade = row.getChildByName('UnavailableShade')!;
            // Resource-short cards remain in their normal colors; the ad badge
            // is the visual cue for the direct-upgrade route.
            shade.active = maxed;
            shade.getComponent(Sprite)!.color = maxed
                ? new Color(255, 255, 255, 120)
                : new Color(0, 0, 0, 0);
            row.getChildByName('SkinSurface')!.getComponent(Sprite)!.color = hovered
                ? new Color(255, 248, 231) : Color.WHITE;
            const badge = row.getChildByName('AdBadge');
            shade.setSiblingIndex(row.children.length - (adEligible && badge ? 2 : 1));
            if (adEligible && badge) badge.setSiblingIndex(row.children.length - 1);
            const tipIcon = row.getChildByName('TipIcon') || this.ensureTipIcon(row);
            this.layoutRowTitleAndTip(row);
            if (tipIcon) tipIcon.setSiblingIndex(row.children.length - 1);
            return;
        }
        const g = this.box(row, 326, 150, new Color(255, 228, 185), hovered ? new Color(255, 250, 222) : new Color(219, 171, 116));
        g.lineWidth = 2; g.strokeColor = new Color(255, 247, 222);
        g.roundRect(-157, -69, 314, 138, 20); g.stroke();
        g.strokeColor = new Color(216, 165, 112);
        g.roundRect(-154, -66, 308, 60, 15); g.stroke();
        g.moveTo(-22, -60); g.lineTo(-22, -13); g.stroke();
        row.getChildByName('New')!.active = false;
        row.getChildByName('ColumnRule67')!.active = false;
        const l = this.label(row, 'Level', String(level), 106, 37, -91, -26, 32); l.node.active = true;
        useDefaultSystemFont(l);
        this.label(row, 'Status', row.getChildByName('Status')!.getComponent(Label)!.string, 155, 48, 65, -36, 25);
        layoutUpgradeCosts(row);
        const shade = this.child(row, 'UnavailableShade', 326, 150, 0, 0);
        shade.setSiblingIndex(row.children.length - 2);
        const shadeG = shade.getComponent(Graphics) || shade.addComponent(Graphics);
        shadeG.clear();
        if (maxed) {
            shadeG.fillColor = new Color(46, 37, 25, 120);
            shadeG.roundRect(-161, -73, 322, 146, 22); shadeG.fill();
        }
        const badge = row.getChildByName('AdBadge');
        shade.setSiblingIndex(row.children.length - (adEligible && badge ? 2 : 1));
        if (adEligible && badge) badge.setSiblingIndex(row.children.length - 1);
        const tipIcon = row.getChildByName('TipIcon') || this.ensureTipIcon(row);
        this.layoutRowTitleAndTip(row);
        if (tipIcon) tipIcon.setSiblingIndex(row.children.length - 1);
    }

    public ensureTipIcon(row: Node): Node {
        let tip = row.getChildByName('TipIcon');
        if (!tip) {
            tip = new Node('TipIcon');
            tip.layer = row.layer;
            row.addChild(tip);
        }
        tip.getComponent(UITransform) || tip.addComponent(UITransform);
        // Keep the exclamation artwork and hit area without the red badge.
        const background = tip.getChildByName('Background');
        if (background) background.active = false;
        const oldSprite = tip.getComponent(Sprite);
        if (oldSprite) oldSprite.enabled = false;
        const art = this.child(tip, 'Art', 18, 28, 0, 0);
        const icon = art.getComponent(Sprite) || art.addComponent(Sprite);
        icon.sizeMode = Sprite.SizeMode.CUSTOM;
        icon.trim = false;
        if (this.tipFrame) icon.spriteFrame = this.tipFrame;
        const btn = tip.getComponent(Button) || tip.addComponent(Button);
        btn.transition = Button.Transition.NONE;
        this.layoutRowTitleAndTip(row);
        const action = row.getChildByName('Action');
        if (action && tip.getSiblingIndex() <= action.getSiblingIndex()) {
            tip.setSiblingIndex(row.children.length - 1);
        }
        return tip;
    }

    public layoutRowTitleAndTip(row: Node): void {
        const nameNode = row.getChildByName('Name');
        if (!nameNode) return;
        const label = nameNode.getComponent(Label);
        if (!label) return;
        const pillCenterX = 56;
        nameNode.setPosition(pillCenterX, nameNode.position.y, 0);
        nameNode.getComponent(UITransform)!.width = 140;
        label.color = new Color(43, 36, 28);
        label.enableOutline = false;
        label.isBold = true;
        label.fontSize = 28;
        label.lineHeight = 32;
        label.enableWrapText = true;
        label.overflow = Label.Overflow.SHRINK;

        const tip = row.getChildByName('TipIcon');
        if (tip) {
            const trans = tip.getComponent(UITransform) || tip.addComponent(UITransform);
            trans.setContentSize(40, 40);
            const card = row.getComponent(UITransform)!;
            tip.setPosition(card.width / 2 - 20, card.height / 2 - 20, 0);
        }

        const pill = row.getChildByName('TitlePill');
        if (pill) {
            pill.active = false;
            pill.setPosition(pillCenterX, pill.position.y, 0);
            const pillTrans = pill.getComponent(UITransform);
            if (pillTrans) {
                pillTrans.width = 164;
            }
        }
    }

    private loadTipIcon(): void {
        const bakedFrame = this.panel.getChildByName('BakedUpgradeSkin')?.getChildByName('tip-icon')?.getComponent(Sprite)?.spriteFrame;
        if (bakedFrame) {
            this.tipFrame = bakedFrame;
            this.applyTipFrameToAll();
            return;
        }
        resources.load('upgrade-skin/exclamation/spriteFrame', SpriteFrame, (error, frame) => {
            if (!error && frame) {
                this.tipFrame = frame;
                this.applyTipFrameToAll();
            } else {
                assetManager.loadAny(UpgradePanelSkin.TIP_ICON_UUID, (err, asset: SpriteFrame) => {
                    if (!err && asset) {
                        this.tipFrame = asset;
                        this.applyTipFrameToAll();
                    }
                });
            }
        });
    }

    private applyTipFrameToAll(): void {
        if (!isValid(this.panel, true)) return;
        const pages = this.panel.getChildByName('Pages');
        if (!pages) return;
        pages.children.forEach(page => {
            const content = page.getChildByPath('Viewport/Content');
            if (!content) return;
            content.children.forEach(row => {
                const tip = row.getChildByName('TipIcon');
                const sp = tip?.getChildByName('Art')?.getComponent(Sprite);
                if (sp && this.tipFrame) sp.spriteFrame = this.tipFrame;
            });
        });
    }
}
