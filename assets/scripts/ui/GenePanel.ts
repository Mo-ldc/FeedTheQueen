import { _decorator, Button, Color, Component, EventTouch, Graphics, Label, RichText, Node, Sprite, SpriteFrame, UITransform, UIOpacity, Vec3, isValid, tween } from 'cc';
import { gameResources as resources } from '../managers/GameBundles';
import { ColonySession } from '../core/ColonySession';
import { BlueberryFeeding } from '../world/BlueberryFeeding';
import { ColonyPrefabs } from '../world/ColonyPrefabs';
import { GENES } from '../config/GeneConfig';
import { GENE_TAB_INDEX } from '../config/UpgradeConfig';
import { GENE_TEXT, EVOLUTION_TEXT } from '../config/GeneDescriptions';
import { originalText } from '../config/OriginalText';
import { useDefaultSystemFont } from './DefaultSystemFont';
const {ccclass}=_decorator;
const TIERS=[20,16,12,8,4,1];
const EVOLUTION_TIERS:Record<string,number>={
 mine:16,silver_spoon_2:16,laboratory:12,fishmonger:12,tunnellers:12,
 sorority:8,sacrifice:8,providence:4,silver_spoon:1,
};
@ccclass('GenePanel')
export class GenePanel extends Component {
 private selected=new Set<string>();private confirmUntil=0;private session!:ColonySession;public content:Node|null=null;
 private idleFrame:SpriteFrame|null=null;private selectedFrame:SpriteFrame|null=null;
 private panelLoading=false;private panelRequested=false;
 private departing=false;
 private panelNode!:Node;private pointer=new Vec3();private hovered='';private elapsed=0;private tipFrame:SpriteFrame|null=null;
 start():void {
  this.session=this.getComponent(ColonySession)!;this.panelNode=this.getComponent(BlueberryFeeding)!.upgrades!.node;
  this.selected=new Set(this.session.genes.suggested);
  this.panelNode.on('gene-panel-open',this.show,this);this.panelNode.parent!.parent!.on(Node.EventType.SIZE_CHANGED,this.layout,this);
  const old=this.panelNode.getChildByPath(`Pages/Page${GENE_TAB_INDEX}/Viewport/Content`);if(old)old.active=false;
 }
 public show():void {
  this.panelRequested=true;
  if(this.content&&isValid(this.content,true)){this.render();return;}
  if(this.panelLoading)return;
  this.panelLoading=true;
  const selectedFrame=new Promise<SpriteFrame>((resolve,reject)=>resources.load('ui/gene-panel/xk2/spriteFrame',SpriteFrame,(error,frame)=>error||!frame?reject(error||new Error('Missing selected gene frame')):resolve(frame)));
  Promise.all([this.getComponent(ColonyPrefabs)!.loadPrefab('GenePanelUI'),selectedFrame]).then(([,frame])=>{
   this.panelLoading=false;if(!isValid(this,true)||!this.panelRequested)return;this.selectedFrame=frame;this.mountPanel();
  }).catch(error=>{this.panelLoading=false;console.error('Gene panel load failed',error);});
 }
 private mountPanel():void {
  if(this.content&&isValid(this.content,true)){this.render();return;}
  const ui=this.panelNode.parent!,root=this.getComponent(ColonyPrefabs)!.create('GenePanelUI',ui);this.content=root;root.setSiblingIndex(ui.children.length-1);
  root.getComponent(UITransform)||root.addComponent(UITransform);
  const opacity=root.getComponent(UIOpacity)||root.addComponent(UIOpacity);opacity.opacity=0;tween(opacity).to(.1,{opacity:255}).start();root.addComponent(Graphics);
  this.idleFrame=root.getChildByName('Gene_'+GENES[0].id)!.getComponent(Sprite)!.spriteFrame;
  for(const tier of TIERS){const label=this.label('Tier'+tier,String(tier),34,70,54);label.outlineColor=new Color(33,21,17);label.outlineWidth=3;}
  const explanation=this.label('Explanation','',22,492,80);
  explanation.cacheMode=Label.CacheMode.NONE;explanation.enableWrapText=true;explanation.overflow=Label.Overflow.CLAMP;
  this.createStatusOverlay();
  this.label('Tooltip/Title','',27,540);
  const desc=root.getChildByPath('Tooltip/Description')!;const oldLabel=desc.getComponent(Label);if(oldLabel)desc.removeComponent(oldLabel);
  const rich=desc.addComponent(RichText);useDefaultSystemFont(rich);rich.fontSize=23;rich.lineHeight=30;rich.maxWidth=540;rich.fontColor=new Color(50,29,20);
  desc.getComponent(UITransform)!.setAnchorPoint(.5,1);
  root.getChildByName('Tooltip')!.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{e.propagationStopped=true;this.hideTooltip();});
  root.getChildByName('Close')!.on(Button.EventType.CLICK,this.close,this);root.getChildByName('ApplyGenes')!.on(Button.EventType.CLICK,this.apply,this);root.getChildByName('NewColony')!.on(Button.EventType.CLICK,this.newColony,this);
  for(const g of GENES)this.bind(root.getChildByName('Gene_'+g.id)!,g.id,GENE_TEXT[g.id]);
  for(const [id,text] of Object.entries(EVOLUTION_TEXT))this.bind(root.getChildByName('Evolution_'+id)!,id,text,false);
  // These headings are baked into the 721 x 938 frame. Align beside their text,
  // without applying the top-right offset used for selectable gene cells.
  for(const [id,x] of [['DNA',-151],['EVO',-27],['SPEC',209]] as [string,number][]){const header=new Node('HeaderTip_'+id);header.layer=root.layer;root.addChild(header);header.addComponent(UITransform).setContentSize(28,30);header.setPosition(x,295);this.bind(header,'header_'+id,[originalText('PRESTIGE_'+id+'_TEXT',{},false),originalText('PRESTIGE_'+id+'_DESCRIPTION')],false);header.getChildByName('TipIcon')!.setPosition(0,0);}
  resources.load('upgrade-skin/exclamation/spriteFrame',SpriteFrame,(error,frame)=>{if(error||!frame||!isValid(root,true))return;this.tipFrame=frame;for(const node of root.children){const icon=node.getChildByPath('TipIcon/Art')?.getComponent(Sprite);if(icon)icon.spriteFrame=frame;}});
  this.layout();this.render();this.panelNode.emit('tab-selected',GENE_TAB_INDEX);
 }
 private label(path:string,text:string,size:number,width:number,height=52):Label {
  const n=this.content!.getChildByPath(path)!;const t=n.getComponent(UITransform)||n.addComponent(UITransform);t.setContentSize(width,height);
  const l=n.getComponent(Label)||n.addComponent(Label);useDefaultSystemFont(l);l.string=text;l.fontSize=size;l.lineHeight=size+5;l.isBold=true;l.color=new Color(92,48,28);l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;l.enableOutline=true;l.outlineColor=new Color(245,202,137);l.outlineWidth=1;
  // Adding a Label with its default NONE overflow can replace the authored size.
  t.setContentSize(width,height);return l;
 }
 private createStatusOverlay():void {
  const root=this.content!,explanation=root.getChildByName('Explanation')!;
  const cover=new Node('ExplanationCover');cover.layer=root.layer;root.addChild(cover);cover.addComponent(UITransform).setContentSize(492,80);cover.setPosition(64,-230);cover.setSiblingIndex(explanation.getSiblingIndex());
  const graphic=cover.addComponent(Graphics);graphic.fillColor=new Color(253,223,160);graphic.rect(-246,-40,492,80);graphic.fill();
  const points=new Node('TotalGenePoints');points.layer=root.layer;root.addChild(points);points.addComponent(UITransform).setContentSize(54,38);points.setPosition(69,-249);
  const count=points.addComponent(Label);useDefaultSystemFont(count);count.fontSize=25;count.lineHeight=30;count.isBold=true;count.color=new Color(46,184,35);count.horizontalAlign=Label.HorizontalAlign.CENTER;count.verticalAlign=Label.VerticalAlign.CENTER;count.enableOutline=true;count.outlineColor=new Color(31,22,18);count.outlineWidth=2;
  const colony=root.getChildByName('NewColony')!,confirmation=new Node('ConfirmCover');confirmation.layer=colony.layer;colony.addChild(confirmation);confirmation.addComponent(UITransform).setContentSize(165,48);
  const paint=confirmation.addComponent(Graphics);paint.fillColor=new Color(170,89,60);paint.roundRect(-82,-24,164,48,12);paint.fill();confirmation.setSiblingIndex(0);
  const caption=this.label('NewColony/Caption','确认建群',26,155,48);caption.color=Color.WHITE;caption.outlineColor=new Color(72,38,27);caption.outlineWidth=3;
  confirmation.active=false;caption.node.active=false;
 }
 private bind(button:Node,id:string,text:[string,string],selectable=true):void {
  if(!button||!text)return;
  const tip=new Node('TipIcon');tip.layer=button.layer;button.addChild(tip);tip.addComponent(UITransform).setContentSize(28,30);tip.addComponent(Button).transition=Button.Transition.NONE;
  const size=button.getComponent(UITransform)!;tip.setPosition(size.width/2-10,size.height/2-9);
  const checkmark=button.getChildByName('Checkmark');if(checkmark)checkmark.setPosition(-17,18);
  const art=new Node('Art');art.layer=tip.layer;tip.addChild(art);art.addComponent(UITransform).setContentSize(19,28);const sprite=art.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.spriteFrame=this.tipFrame;
  for(const type of [Node.EventType.TOUCH_START,Node.EventType.TOUCH_MOVE,Node.EventType.TOUCH_END,Node.EventType.TOUCH_CANCEL])tip.on(type,(e:EventTouch)=>{e.propagationStopped=true;});
  tip.on(Button.EventType.CLICK,()=>{if(this.hovered===id){this.hideTooltip();return;}this.hovered=id;this.pointer=this.content!.getComponent(UITransform)!.convertToNodeSpaceAR(tip.worldPosition);this.showTooltip(text);});
  if(selectable)button.on(Button.EventType.CLICK,()=>{this.hideTooltip();const gene=GENES.find(g=>g.id===id)!;if(this.session.genes.selected.includes(id)||gene.tier>this.session.genes.available)return;if(this.selected.has(id))this.selected.delete(id);else if(this.selected.size<this.session.genes.remaining)this.selected.add(id);this.session.genes.suggested=[...this.selected];this.render();},this);
 }
 private showTooltip(text:[string,string]):void {if(!this.content)return;const tip=this.content.getChildByName('Tooltip')!;tip.active=true;tip.getChildByName('Title')!.getComponent(Label)!.string=text[0];tip.getChildByName('Description')!.getComponent(RichText)!.string=text[1];tip.setSiblingIndex(this.content.children.length-1);this.positionTooltip();}
 private positionTooltip():void {
  if(!this.content)return;const tip=this.content.getChildByName('Tooltip')!,desc=tip.getChildByName('Description')!;
  const height=Math.max(150,desc.getComponent(UITransform)!.height+90),width=580;
  tip.getComponent(UITransform)!.setContentSize(width,height);tip.getChildByName('Title')!.setPosition(0,height/2-32);desc.setPosition(0,height/2-68);
  const g=tip.getComponent(Graphics)||tip.addComponent(Graphics);g.clear();g.fillColor=new Color(252,230,195);g.strokeColor=new Color(67,21,17);g.lineWidth=4;g.roundRect(-width/2,-height/2,width,height,16);g.fill();g.stroke();
  const canvas=this.content.getComponent(UITransform)!,halfH=canvas.height/2,halfW=canvas.width/2;
  const y=this.pointer.y>0?this.pointer.y-height/2-35:this.pointer.y+height/2+35;
  tip.setPosition(Math.max(-halfW+width/2+8,Math.min(halfW-width/2-8,0)),Math.max(-halfH+height/2+8,Math.min(halfH-height/2-8,y)));
 }
 private hideTooltip=():void=>{this.hovered='';if(this.content)this.content.getChildByName('Tooltip')!.active=false;};
 private apply=():void=>{if(!this.selected.size)return;if(this.session.applyGenes([...this.selected]))this.selected.clear();this.render();};
 private newColony=():void=>{
  if(this.departing||!this.session.isReady||this.session.isDeparting)return;
  if(this.confirmUntil){
   this.departing=true;
   for(const button of this.content!.getComponentsInChildren(Button))button.interactable=false;
   const opacity=this.content!.getComponent(UIOpacity)!;
   tween(opacity).to(.1,{opacity:0}).call(()=>{if(!isValid(this,true))return;this.close();this.session.newColony();}).start();
   return;
  }
  this.confirmUntil=Infinity;this.render();
 };
 public render():void {
  if(!this.content)return;const model=this.session.genes,total=this.session.progression.dnaLevel;
  for(const tier of TIERS){const unlocked=tier<=model.available,tl=this.content.getChildByName('Tier'+tier)!.getComponent(Label)!;tl.color=unlocked?new Color(52,205,74):Color.WHITE;}
  for(const [id,tier] of Object.entries(EVOLUTION_TIERS)){const n=this.content.getChildByName('Evolution_'+id)!,unlocked=tier<=model.available;this.paint(n,unlocked,unlocked);n.getChildByName('Checkmark')!.active=unlocked;}
  for(const gene of GENES){const n=this.content.getChildByName('Gene_'+gene.id)!,applied=model.selected.includes(gene.id),pending=this.selected.has(gene.id),available=gene.tier<=model.available;this.paint(n,applied||pending,available&&!applied);n.getChildByName('Checkmark')!.active=applied||pending;n.getComponent(Button)!.interactable=available&&!applied;}
  const left=model.remaining-this.selected.size,explain=this.content.getChildByName('Explanation')!.getComponent(Label)!;
  const editing=this.selected.size>0||model.remaining>0;
  this.content.getChildByName('ExplanationCover')!.active=editing;explain.node.active=editing;
  this.content.getChildByName('TotalGenePoints')!.active=!editing;
  this.content.getChildByName('TotalGenePoints')!.getComponent(Label)!.string=String(total);
  if(editing)explain.string=originalText('PRESTIGE_TEXT_LEFT',{value:left},false)+'\n'+originalText('PRESTIGE_TEXT_APPLY',{},false);
  const apply=this.content.getChildByName('ApplyGenes')!;apply.getComponent(Button)!.interactable=this.selected.size>0;apply.getComponent(Sprite)!.color=Color.WHITE;
  const confirming=Date.now()<this.confirmUntil,colony=this.content.getChildByName('NewColony')!;
  colony.getChildByName('ConfirmCover')!.active=confirming;colony.getChildByName('Caption')!.active=confirming;
 }
 private paint(n:Node,selected:boolean,available:boolean):void {const sprite=n.getComponent(Sprite)!;sprite.spriteFrame=selected?this.selectedFrame||this.idleFrame:this.idleFrame;sprite.color=Color.WHITE;const icon=n.getChildByName('Icon')!,opacity=icon.getComponent(UIOpacity)||icon.addComponent(UIOpacity);opacity.opacity=selected||available?255:85;}
 private layout=():void=>{if(!this.content)return;const canvas=this.panelNode.parent!.parent!.getComponent(UITransform)!;const scale=Math.min(1,(canvas.width-8)/721,(canvas.height-8)/938);this.content.setScale(scale,scale,1);this.content.getComponent(UITransform)!.setContentSize(canvas.width/scale,canvas.height/scale);const g=this.content.getComponent(Graphics)!;g.clear();g.fillColor=new Color(0,0,0,135);g.rect(-canvas.width/scale/2,-canvas.height/scale/2,canvas.width/scale,canvas.height/scale);g.fill();};
 public close=():void=>{this.panelRequested=false;this.hideTooltip();this.confirmUntil=0;this.departing=false;if(this.content&&isValid(this.content,true))this.content.destroy();this.content=null;};
 lateUpdate():void {if(this.hovered)this.positionTooltip();}
 update(dt:number):void {if(!this.content)return;this.elapsed+=dt;if(this.elapsed>=1){this.elapsed=0;this.render();}}
 onDestroy():void {this.panelNode?.off('gene-panel-open',this.show,this);this.panelNode?.parent?.parent?.off(Node.EventType.SIZE_CHANGED,this.layout,this);this.close();}
}
