import { paperSurface, PORTRAIT } from './PortraitUI';
import { layoutUpgradeCosts } from './UpgradeCostLayout';
import { assetManager, Button, Color, Graphics, Label, Layout, Node, RichText, Sprite, SpriteFrame, UITransform, isValid, instantiate } from 'cc';
import { gameResources as resources } from '../managers/GameBundles';
import { UPGRADE_GROUPS, TAB_ORDER } from '../config/UpgradeConfig';
import { UPGRADE_ART } from '../config/UpgradeArtConfig';
import { useDefaultSystemFont } from './DefaultSystemFont';
import { upgradeCountCaption } from './UpgradeCardText';

/** Reference-inspired dock. Only presentation is changed; purchase rules stay in UpgradeState. */
export class UpgradePanelSkin {
    static readonly width = 300;
    static height = 880;
    static viewportHeight = 780;
    private static readonly iconBoxSize = 64;
    private readonly optionHeaderSpaces = new Map<number, number>();
    private static readonly TIP_ICON_UUID = 'd217d682-0367-41eb-bf29-50f4e40b8801@f9941';
    private readonly ink = new Color(79, 49, 29);
    private badgeFrame: SpriteFrame | null = null;
    private tipFrame: SpriteFrame | null = null;
    private readonly loadedIconPages = new Set<number>();
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
            transform.setContentSize(280, visibleHeight);
            viewport.setPosition(0, -space / 2, viewport.position.z);
            const content = viewport.getChildByName('Content');
            if (content && delta !== 0) content.setPosition(content.position.x, content.position.y - delta / 2, content.position.z);
            this.optionHeaderSpaces.set(page, space);
        }
        return visibleHeight;
    }

    /** Right-side panel uses the available height below the compact HUD. */
    resize(height:number):void {
        UpgradePanelSkin.height=height;UpgradePanelSkin.viewportHeight=height-126;
        this.panel.getComponent(UITransform)!.setContentSize(300,height);
        const bg=this.panel.getChildByName('bg')!;bg.getComponent(UITransform)!.setContentSize(300,height);
        bg.getChildByName('SkinSurface')?.getComponent(UITransform)?.setContentSize(300,height);
        const tabs=this.panel.getChildByName('TabScroll')!;tabs.setPosition(-140,height/2-44);
        tabs.setSiblingIndex(this.panel.children.length-1);
        this.label(this.panel,'CategoryHint','左右滑动切换分类',280,24,0,height/2-90,18).node.setSiblingIndex(this.panel.children.length-1);
        tabs.getComponent(UITransform)!.setContentSize(280,64);
        const tabView=tabs.getChildByName('Viewport')!;tabView.setPosition(0,0);tabView.getComponent(UITransform)!.setContentSize(280,64);
        const tabContent=tabView.getChildByName('tab')!;
        tabContent.getComponent(UITransform)!.height=64;tabContent.setPosition(tabContent.position.x,0);
        const pages=this.panel.getChildByName('Pages')!;pages.setPosition(0,-50);
        pages.getComponent(UITransform)!.setContentSize(280,UpgradePanelSkin.viewportHeight);
        pages.children.forEach((page,index)=>{
            const space=this.optionHeaderSpaces.get(index)||0,h=UpgradePanelSkin.viewportHeight-space;
            page.getComponent(UITransform)!.setContentSize(280,UpgradePanelSkin.viewportHeight);
            const view=page.getChildByName('Viewport')!;view.getComponent(UITransform)!.setContentSize(280,h);view.setPosition(0,-space/2);
            view.getChildByName('Content')!.setPosition(0,h/2);
            page.getChildByName('OptionHeader')?.setPosition(0,UpgradePanelSkin.viewportHeight/2);
        });
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
        pages.getComponent(UITransform)!.setContentSize(280, UpgradePanelSkin.viewportHeight);
        pages.children.forEach(page => {
            page.getComponent(UITransform)!.setContentSize(280, UpgradePanelSkin.viewportHeight);
            const viewport = page.getChildByName('Viewport')!;
            viewport.getComponent(UITransform)!.setContentSize(280, UpgradePanelSkin.viewportHeight);
            const content = viewport.getChildByName('Content')!;
            content.setPosition(0, UpgradePanelSkin.viewportHeight / 2);
            content.getComponent(UITransform)!.width = 280;
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
        badge.setPosition(116, -5, 0);
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
        if (layout) layout.enabled = false;
        if (layout?.enabled) {
            layout.updateLayout();
            return;
        }
        const visible = root.children.filter(tab => tab.active);
        const hint=this.panel.getChildByName('CategoryHint');if(hint)hint.active=visible.length>2;
        const viewport = this.panel.getChildByPath('TabScroll/Viewport');
        visible.forEach((tab, slot) => tab.setPosition(viewport ? 70 + 140 * slot : -222 + 222 * slot, viewport ? 0 : 206));
        const transform=root.getComponent(UITransform);
        if(transform)transform.width = Math.max(
            viewport?.getComponent(UITransform)?.width || 0, visible.length * 140);
    }

    tab(index: number, selected: boolean, unlocked: boolean): void {
        const tab = this.tabNode(index);
        if(!tab)return;
        tab.active = unlocked;
        if (!unlocked) return;
        for (const name of ['SkinSurface', 'Selected', 'Icon']) {
            const child = tab.getChildByName(name); if (child) child.active = false;
        }
        tab.getComponent(UITransform)!.setContentSize(132, 64);
        paperSurface(tab, 132, 64, selected ? PORTRAIT.brown : PORTRAIT.paper);
        const caption = this.label(tab, 'Label', tab.getChildByName('Label')!.getComponent(Label)!.string, 124, 52, 0, 0, 26);
        caption.color = selected ? new Color(255, 245, 223) : PORTRAIT.ink;
        caption.enableOutline = false;
    }

    card(row: Node, slot: number, top: number, level: number, maxed: boolean, affordable: boolean, hovered: boolean, adEligible: boolean): void {
        row.getComponent(UITransform)!.setContentSize(272, 166);
        row.setPosition(0, -87 - slot * 176 - top);
        for (const name of ['TitlePill', 'New', 'ColumnRule1', 'ColumnRule67', 'UnavailableShade']) {
            const child = row.getChildByName(name); if (child) child.active = false;
        }
        const surface = row.getChildByName('SkinSurface')!;
        surface.active = true; surface.getComponent(UITransform)!.setContentSize(272,166);
        const sprite=surface.getComponent(Sprite)!;sprite.enabled=true;sprite.type=Sprite.Type.SLICED;sprite.sizeMode=Sprite.SizeMode.CUSTOM;
        sprite.color=maxed?new Color(220,204,179):hovered?new Color(255,243,218):Color.WHITE;
        const rootSprite=row.getComponent(Sprite);if(rootSprite)rootSprite.enabled=false;
        const art = row.getChildByName('Illustration'); if (art) art.setPosition(-91, 40);
        this.label(row, 'Level', String(level), 76, 32, -91, -20, 28);
        this.label(row, 'CountCaption', upgradeCountCaption(row.name, maxed), 82, 32, -91, -55, 20);
        const action = row.getChildByName('Action');
        if (action) { action.setPosition(0, 0); action.getComponent(UITransform)!.setContentSize(272, 166); }
        const status = row.getChildByName('Status');
        if (status) { status.setPosition(38, -38); status.getComponent(UITransform)!.setContentSize(148, 52); }
        const price = this.child(row, 'PricePlate', 150, 78, 38, -38);
        paperSurface(price, 150, 78, affordable ? PORTRAIT.sand : new Color(238, 214, 179));
        price.setSiblingIndex(1);
        layoutUpgradeCosts(row);
        const badge = row.getChildByName('AdBadge');
        if (badge) { badge.active = adEligible; badge.setPosition(116, -5); badge.setSiblingIndex(row.children.length - 1); }
        const tip = row.getChildByName('TipIcon') || this.ensureTipIcon(row);
        this.layoutRowTitleAndTip(row);
        tip.setSiblingIndex(row.children.length - 1);
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
        const pillCenterX = 21;
        nameNode.setPosition(pillCenterX, 43, 0);
        nameNode.getComponent(UITransform)!.width = 164;
        label.color = new Color(43, 36, 28);
        label.enableOutline = false;
        label.isBold = true;
        label.fontSize = 26;
        label.lineHeight = 32;
        label.enableWrapText = true;
        label.overflow = Label.Overflow.SHRINK;

        const tip = row.getChildByName('TipIcon');
        if (tip) {
            const trans = tip.getComponent(UITransform) || tip.addComponent(UITransform);
            trans.setContentSize(40, 40);
            const card = row.getComponent(UITransform)!;
            tip.setPosition(118, 62, 0);
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
