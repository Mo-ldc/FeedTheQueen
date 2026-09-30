import { ACHIEVEMENT_DESCRIPTIONS } from '../config/AchievementText';
import { originalText } from '../config/OriginalText';
import { TUTORIALS } from '../config/TutorialConfig';
import { syncAchievements } from "../core/AchievementSync";
import { MenuBackdrop } from './MenuBackdrop';
import { _decorator, Component, Node, Graphics, Color, UITransform, Label, ScrollView, Mask, Sprite, Button, BlockInputEvents, EventTouch, Vec3, Prefab, instantiate, isValid, sys } from 'cc';
import { gameResources as resources } from '../managers/GameBundles';
import { preferences, playerMeta, savePlayerMeta, ACHIEVEMENTS, unlockAchievement } from '../core/PlayerMeta';
import { ColonySession } from '../core/ColonySession';
import { BlueberryFeeding } from '../world/BlueberryFeeding';
import { caption, choice } from '../world/FacilitySupport';
import { playOriginalSound } from '../core/OriginalSound';
import { paperSurface, PORTRAIT } from './PortraitUI';
const {ccclass}=_decorator;
const GUIDE=[...TUTORIALS.map(t=>[t.title,t.text]),['食物',originalText('DESCRIPTION_FOOD',{},false)],['查看说明','点击升级选项或基因图标旁的感叹号，即可查看说明。点击提示窗即可收起。']];
@ccclass('GameMenu')
export class GameMenu extends Component {
    private feeding!:BlueberryFeeding;
    private ui:Node|null=null;
    private canvasNode:Node|null=null;
    private overlay:Node|null=null;
    private backdrop:Node|null=null;
    private settingsButton:Node|null=null;
    private returnButton:Node|null=null;
    private settingsPrefab:Prefab|null=null;
    private settingsPrefabPromise:Promise<Prefab>|null=null;
    private timer:Label|null=null;
    private age=0;

    start():void {
        this.feeding=this.getComponent(BlueberryFeeding)!;
        this.ui=this.feeding?this.feeding.upgrades!.node.parent!:this.node;
        this.canvasNode=this.feeding?this.ui.parent:this.ui;
        this.canvasNode!.on(Node.EventType.SIZE_CHANGED,this.layout,this);
        if(this.feeding){this.timer=caption(this.ui,'PlayTimer','',0,0,280,22);this.bindReturnButton();}
        else this.bindSettingsButton();
        this.layout();
    }

    private layout():void {
        const canvas=this.canvasNode?.getComponent(UITransform);
        if(!canvas)return;

        const safe=sys.getSafeAreaRect(false);
        const left=Math.max(-canvas.width/2,safe.x-canvas.width/2);
        const right=Math.min(canvas.width/2,safe.x+safe.width-canvas.width/2);
        const bottom=Math.max(-canvas.height/2,safe.y-canvas.height/2);
        const top=Math.min(canvas.height/2,safe.y+safe.height-canvas.height/2);
        const safeWidth=Math.max(1,right-left);
        const safeHeight=Math.max(1,top-bottom);
        const centerX=(left+right)/2;
        const centerY=(bottom+top)/2;

        this.timer?.node.setPosition(centerX,top-110);

        if(this.backdrop?.name==='SettingsShade'){
            this.backdrop.getComponent(UITransform)?.setContentSize(canvas.width,canvas.height);
            const shade=this.backdrop.getComponent(Graphics);
            shade?.clear();
            if(shade){
                shade.fillColor=new Color(15,12,13,170);
                shade.rect(-canvas.width/2,-canvas.height/2,canvas.width,canvas.height);
                shade.fill();
            }
        }

        if(this.overlay){
            const settings=this.overlay.name==='SettingsPanel';
            const scale=settings
                ?Math.min(1,(safeWidth-24)/716,(safeHeight-80)/803)
                :Math.min(1,(safeWidth-20)/680,(safeHeight-20)/620);
            this.overlay.setScale(scale,scale,1);
            this.overlay.setPosition(centerX,centerY+(settings?Math.min(110,safeHeight*.06):0));
        }
    }
    private bindSettingsButton():void {
        this.settingsButton=this.ui!.getChildByName('SettingsButton');
        this.settingsButton?.on(Button.EventType.CLICK,this.openSettings,this);
    }
    private openSettings():void {playOriginalSound('button_click');this.show('settings');}
    private bindReturnButton():void {
        this.returnButton=this.ui!.getChildByName('ReturnButton');
        this.returnButton?.on(Button.EventType.CLICK,this.returnToMain,this);
    }
    private returnToMain():void {
        if(!this.getComponent(ColonySession)?.returnToMain())return;
        const button=this.returnButton?.getComponent(Button);if(button)button.interactable=false;
        playOriginalSound('button_click');this.close();
    }
    private loadSettingsPrefab():Promise<Prefab> {
        if(this.settingsPrefab)return Promise.resolve(this.settingsPrefab);
        if(!this.settingsPrefabPromise){
            this.settingsPrefabPromise=new Promise<Prefab>((resolve,reject)=>{
                resources.load('ui/lazy-prefabs/SettingsPanel',Prefab,(error,prefab)=>{
                    if(error||!prefab){
                        this.settingsPrefabPromise=null;
                        reject(error??new Error('SettingsPanel.prefab is missing.'));
                        return;
                    }
                    this.settingsPrefab=prefab;
                    resolve(prefab);
                });
            });
        }
        return this.settingsPrefabPromise!;
    }

    private bindSettingsPanel(panel:Node):void {
        paperSurface(panel.getChildByName('Background')!, 716, 803);
        const title=caption(panel,'SettingsTitle','声音设置',-95,306,390,40);
        title.color=PORTRAIT.ink; title.enableOutline=false;
        const close=panel.getChildByName('Close');
        if(close){
            close.setPosition(260,306);close.getComponent(UITransform)!.setContentSize(120,64);
            paperSurface(close,120,64,PORTRAIT.brown);
            const text=caption(close,'Caption','关闭',0,0,108,28);text.enableOutline=false;
        }
        close?.on(Button.EventType.CLICK,()=>{
            playOriginalSound('button_click');
            this.close();
        });

        (['master','music','sfx','uiSfx'] as const).forEach((key)=>{
            const group=panel.getChildByName(`Slider_${key}`);
            const fill=group?.getChildByName('Fill')?.getComponent(Sprite);
            const knob=group?.getChildByName('Knob');
            const touch=group?.getChildByName('TouchArea');
            const transform=group?.getComponent(UITransform);
            if(!group||!fill||!knob||!touch||!transform){
                console.error(`SettingsPanel.prefab is missing controls for ${key}.`);
                return;
            }

            const names={master:'总音量',music:'背景音乐',sfx:'游戏音效',uiSfx:'按钮音效'};
            const name=caption(panel,`Name_${key}`,names[key],-204,group.position.y,210,30);
            name.color=PORTRAIT.ink;name.enableOutline=false;
            const percent=caption(group,'Percent','',0,-44,150,22);
            percent.color=PORTRAIT.muted;percent.enableOutline=false;
            knob.getComponent(UITransform)!.setContentSize(38,44);
            paperSurface(knob,38,44,PORTRAIT.sand);

            const draw=()=>{
                const value=preferences[key];
                percent.string=`${Math.round(value*100)}%`;
                fill.fillRange=value;
                knob.setPosition(-148+296*value,0);
            };
            const drag=(event:EventTouch)=>{
                event.propagationStopped=true;
                const point=event.getUILocation();
                const local=transform.convertToNodeSpaceAR(new Vec3(point.x,point.y));
                preferences[key]=Math.max(0,Math.min(1,Math.round((local.x+148)/296*100)/100));
                draw();
            };

            draw();
            touch.on(Node.EventType.TOUCH_START,drag);
            touch.on(Node.EventType.TOUCH_MOVE,drag);
            touch.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{
                drag(event);
                savePlayerMeta();
                playOriginalSound('ui_option_toggle');
            });
            touch.on(Node.EventType.TOUCH_CANCEL,()=>savePlayerMeta());
        });
    }

    private showSettings():void {
        this.close();
        const ui=this.ui;
        if(!ui)return;

        const shade=this.backdrop=new Node('SettingsShade');
        shade.layer=MenuBackdrop.layer;
        ui.addChild(shade);
        shade.addComponent(UITransform);
        shade.addComponent(Graphics);
        shade.addComponent(BlockInputEvents);
        shade.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{
            event.propagationStopped=true;
            this.close();
        });
        this.layout();

        this.loadSettingsPrefab()
            .then((prefab)=>{
                if(!isValid(shade,true)||this.backdrop!==shade)return;
                const panel=this.overlay=instantiate(prefab);
                panel.name='SettingsPanel';
                panel.layer=MenuBackdrop.layer;
                ui.addChild(panel);
                this.bindSettingsPanel(panel);
                this.layout();
            })
            .catch((error)=>{
                console.error('Settings prefab failed to load',error);
                if(this.backdrop===shade)this.close();
            });
    }
    public show(section:'settings'|'guide'|'achievements'):void {
        if(section==='settings'){this.showSettings();return;}
        this.close();const ui=this.ui;if(!ui)return;this.backdrop=new Node('MenuBackdrop');this.backdrop.layer=MenuBackdrop.layer;ui.addChild(this.backdrop);this.backdrop.addComponent(MenuBackdrop);const n=this.overlay=new Node('GameMenuOverlay');n.layer=MenuBackdrop.layer;ui.addChild(n);n.addComponent(UITransform).setContentSize(680,620);
        const g=n.addComponent(Graphics);g.fillColor=new Color(78,52,35,252);g.strokeColor=new Color(227,183,121);g.lineWidth=5;g.roundRect(-340,-310,680,620,22);g.fill();g.stroke();
        caption(n,'Title',section==='guide'?'玩法说明':`成就 ${playerMeta.achievements.length} / ${Object.keys(ACHIEVEMENTS).length}`,0,270,500,32);
        choice(n,'Close','关闭',265,270,100,()=>this.close());
        (['settings','guide','achievements'] as const).forEach((key,i)=>choice(n,key,['设置','玩法说明','成就'][i],(i-1)*212,205,200,()=>this.show(key)));
        const view=new Node('Viewport');view.layer=n.layer;n.addChild(view);view.setPosition(0,-30);view.addComponent(UITransform).setContentSize(650,430);view.addComponent(Mask);
        const content=new Node('Content');content.layer=n.layer;view.addChild(content);const transform=content.addComponent(UITransform);transform.setAnchorPoint(.5,1);transform.setContentSize(640,430);content.setPosition(0,215);
        const scroll=view.addComponent(ScrollView);scroll.content=content;scroll.horizontal=false;scroll.vertical=true;
        if(section==='guide'){
            GUIDE.forEach(([title,text],i)=>{caption(content,'Title'+i,title,0,-27-i*220,620,26);const l=caption(content,'Text'+i,text,0,-84-i*140,610,22);l.enableWrapText=true;l.node.getComponent(UITransform)!.height=170;});transform.height=GUIDE.length*220;
        }else{
            Object.entries(ACHIEVEMENTS).forEach(([id,title],i)=>{caption(content,'Achievement_'+id,(playerMeta.achievements.includes(id)?'✓ ':'· ')+title,0,-25-i*125,600,25);const description=caption(content,'AchievementDescription_'+id,ACHIEVEMENT_DESCRIPTIONS[id],0,-76-i*125,600,21);description.node.getComponent(UITransform)!.height=70;description.enableWrapText=true;});transform.height=Object.keys(ACHIEVEMENTS).length*125;
        }this.layout();
    }
    update(dt:number):void {
        if(!this.feeding)return;
        const returnControl=this.returnButton?.getComponent(Button);
        if(returnControl)returnControl.interactable=!!this.getComponent(ColonySession)?.canReturnToMain;
        this.age+=dt;if(this.age<1)return;this.age=0;void syncAchievements();
        const session=this.getComponent(ColonySession)!;if(this.timer){this.timer.node.active=preferences.timer;const seconds=Math.floor(session.playSeconds);this.timer.string=`${Math.floor(seconds/3600)}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
        this.audit();
    }
    public audit():void {const session=this.getComponent(ColonySession)!;
        const state=this.feeding.upgrades!.upgradeState,l=(id:string)=>state.level(id),p=session.progression,s=this.feeding.tastes.state;
        const checks:Record<string,boolean>={levelup:p.queenLevel>0,millionaire:state.resources.nutrients>1e6,billionaire:state.resources.nutrients>1e9,overmind:p.dnaLevel>=25,strength:state.totalLarvae>100,'30_foragers':l('foragers_SpawnForager')>=30,'30_haulers':Math.max(l('haulers_SpawnHauler'),l('gemini_SpawnGemini'))>=30,'30_throwers':l('throwers_SpawnThrower')>=30,'30_trappers':l('hunters_SpawnHunter')+l('hunters_SpawnBGH')>=30,'30_mushies':l('mushrooms_SpawnMycologist')+l('mushrooms_SpawnHandler')>=30,'2_tunnellers':state.activeTunnellers>=2,'5_boats':l('fishing_firstboat')+l('fishing_extra_boat')+l('fishing_ghostship')>=5,spore_100:state.sporeEffects.efficiency>=1,spore_150:state.sporeEffects.efficiency>=1.5,aphid_type:!!(l('farm_FireBugs')||l('farm_MeatBugs')),max_trees:100+(l('orchard_MoreTrees')+l('orchard_MoreTreesExtra'))*5+l('orchard_Plenty')*40>=200,max_cold:s.cold>=100,max_hot:s.heat>=5000,max_frostburn:s.frostburn>=1000,max_sour:s.sour>=500,max_ecsta:s.ecstasy>=100,max_irid:s.shine>=50,max_umami:s.umami>=200,max_bonus:this.feeding.tastes.addend>=3000,max_mult:this.feeding.tastes.multiplier>=100,balanced:Object.keys(this.feeding.window.amounts).filter(k=>+k<=19).length>=6,'3_buffs':[s.heatBonus,s.coldBonus,s.frostburnBonus,s.sourBonus,s.sourAddend,s.ecstasyBonus,s.shineBonus,s.umami].filter(v=>v>0).length>=3};
        const buildings:Record<string,string>={foragers:'queen_BuildingForagers',haulers:'queen_BuildingHaulers',gemini:'evolution_BuildingGemini',brain:'queen_BuildingEvolutionChamber',farm:'evolution_BuildingFarm',orchard:'evolution_BuildingOrchard',throwers:'evolution_BuildingThrowers',traps:'evolution_BuildingHunters',cuisine:'evolution_BuildingCuisine',mushies:'evolution_BuildingMushrooms',fish:'evolution_BuildingFishing',tunnels:'evolution_BuildingTunnellers',mine:'evolution_BuildingMine'};
        Object.entries(buildings).forEach(([id,upgrade])=>checks['build_'+id]=!!l(upgrade));[1,4,8,12,16,20].forEach((threshold,i)=>checks['evolution_'+(i+1)]=p.dnaLevel>=threshold);
        for(const [id,on]of Object.entries(checks))if(on)unlockAchievement(id);
    }
    public close():void {if(this.overlay&&isValid(this.overlay,true))this.overlay.destroy();this.overlay=null;if(this.backdrop&&isValid(this.backdrop,true))this.backdrop.destroy();this.backdrop=null;}
    onDestroy():void {if(this.canvasNode&&isValid(this.canvasNode,true))this.canvasNode.off(Node.EventType.SIZE_CHANGED,this.layout,this);this.close();if(this.timer&&isValid(this.timer.node,true))this.timer.node.destroy();if(this.settingsButton&&isValid(this.settingsButton,true))this.settingsButton.off(Button.EventType.CLICK,this.openSettings,this);if(this.returnButton&&isValid(this.returnButton,true))this.returnButton.off(Button.EventType.CLICK,this.returnToMain,this);}
}
