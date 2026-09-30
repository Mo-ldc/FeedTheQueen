import { OceanWaves } from "../world/OceanWaves";
import { WorldContinuity } from "../world/WorldContinuity";
import { ColonyTutorial } from "../ui/ColonyTutorial";
import { ColonyCinematics } from "../ui/ColonyCinematics";
import { RewardedAdSidebar } from '../ui/RewardedAdSidebar';
import { cancelGameFadeIn, consumeMainMenuRequest, loadGameThroughLoading, requestGameFadeIn, requestMainMenu } from '../scene/SceneTransition';
import { GameMenu } from '../ui/GameMenu';
import { loadGameScene } from '../managers/GameBundles';
import { ColonyAudio } from './ColonyAudio';
import { preferences, playerMeta, unlockAchievement, savePlayerMeta } from './PlayerMeta';
import { _decorator, Color, Component, director, game, Game, Graphics, isValid, Label, Node, tween, UITransform, UIOpacity, Vec3 } from 'cc';
import { BlueberryFeeding } from '../world/BlueberryFeeding';
import { QueenLifecycle } from '../world/QueenLifecycle';
import { LarvaPopulation } from '../world/LarvaPopulation';
import { EvolutionChamber } from '../world/EvolutionChamber';
import { GreyMatterDelivery } from '../world/GreyMatterDelivery';
import { playOriginalSound } from './OriginalSound';
import { Orchard } from '../world/Orchard';
import { AphidFarm } from '../world/AphidFarm';
import { MushroomLab } from '../world/MushroomLab';
import { ThrowerDen } from '../world/ThrowerDen';
import { HunterCamp } from '../world/HunterCamp';
import { Kitchen } from '../world/Kitchen';
import { Fishing } from '../world/Fishing';
import { AdvancedFacilities } from '../world/AdvancedFacilities';
import { GenePanel } from '../ui/GenePanel';
import { GeneModel } from './GeneModel';
import { UpgradeState } from '../ui/UpgradeState';
import { TUNNELLER_TAB_INDEX } from '../config/UpgradeConfig';
import { FeedingModel } from './FeedingModel';
import { WorldLayers } from '../world/WorldLayers';
import { FeedingRateLedger } from '../world/FeedingRateLedger';
import { ProgressionModel } from './ProgressionModel';
import { colonySave } from './ColonyPersistence';
import { Food } from './FeedingModel';
import { useDefaultSystemFont } from '../ui/DefaultSystemFont';
import { ColonyPrefabs } from '../world/ColonyPrefabs';
const { ccclass } = _decorator;
@ccclass('ColonySession')
export class ColonySession extends Component {
    public readonly progression = new ProgressionModel();
    public readonly genes = new GeneModel();
    public playSeconds = 0; public history = { noCarrier: true, larvaePurchases: 0 };
    public totalNutrition = 0;
    private feeding: BlueberryFeeding | null = null;
    private queen: QueenLifecycle | null = null;
    private second = 0;
    private saveSeconds = 0;
    private pendingRewards: number[] = [];
    private readonly morphRewards = new Map<number, number>();
    private greyMatter: GreyMatterDelivery | null = null;
    private ready = false;
    public isDeparting = false;
    private startupOverlay: Node | null = null;
    private startupLabel: Label | null = null;
    public get isReady():boolean { return this.ready; }
    async start(): Promise<void> {
        this.feeding = this.getComponent(BlueberryFeeding);
        if (!this.feeding?.queen || !this.feeding.upgrades) return;
        const saved = colonySave.load();
        if (saved) { this.progression.restore(saved.progression); this.playSeconds = saved.playSeconds; this.totalNutrition = saved.totalNutrition; this.pendingRewards = [...(saved.pendingRewards || [])]; this.feeding.tastes.feastCharges=saved.feastCharges||0; }
        if (saved?.genes) this.genes.restore(saved.genes); if (saved?.history) this.history = { ...saved.history }; else if (saved) { this.history = { noCarrier: !["foragers_SpawnForager", "haulers_SpawnHauler", "gemini_SpawnGemini", "throwers_SpawnThrower"].some(id => !!saved.upgrades.levels[id]), larvaePurchases: saved.upgrades.levels.queen_SpawnLarvae || 0 }; }
        this.feeding.upgrades.upgradeState.genes = this.genes.flags;
        this.feeding.upgrades.refresh();
        const prefabCatalog = this.getComponent(ColonyPrefabs);
        if (!prefabCatalog) { console.error('ColonySession: missing prefab catalog'); return; }
        if (!(this.node.parent?.getComponent('GameScene') as Component & { enteringNewColony: boolean })?.enteringNewColony)
            this.showStartupLoading();
        try {
            await prefabCatalog.loadCatalog((completed, total) => {
                if (this.startupLabel && isValid(this.startupLabel, true))
                    this.startupLabel.string = total > 0 ? `正在准备场景 ${Math.floor(completed / total * 100)}%` : '正在准备场景…';
            });
        } catch (error) {
            console.error('Colony prefab loading failed', error);
            if (this.startupLabel && isValid(this.startupLabel, true)) this.startupLabel.string = '场景资源加载失败';
            return;
        }
        if (!isValid(this, true)) return;
        prefabCatalog.beginStartupFade();
        this.getComponent(EvolutionChamber)?.restore(saved?.evolution);
        this.getComponent(EvolutionChamber)?.onPrefabCatalogReady();
        this.queen = this.feeding.queen.getComponent(QueenLifecycle) || this.feeding.queen.addComponent(QueenLifecycle);
        this.queen.restore(this.progression.queenLevel);
        this.queen.node.on('queen-morph-complete', this.onQueenMorphComplete, this);
        this.greyMatter = this.getComponent(GreyMatterDelivery) || this.addComponent(GreyMatterDelivery);
        this.greyMatter.initialize(saved?.greyMatterFlights);
        this.node.on('grey-matter-arrived', this.onGreyMatterArrived, this);
        this.node.on('grey-matter-delivered', this.onGreyMatterDelivered, this);
        if (!this.getComponent(Orchard)) this.addComponent(Orchard);
        if (!this.getComponent(AphidFarm)) this.addComponent(AphidFarm);
        if (!this.getComponent(MushroomLab)) this.addComponent(MushroomLab);
        if (!this.getComponent(ThrowerDen)) this.addComponent(ThrowerDen);
        if (!this.getComponent(HunterCamp)) this.addComponent(HunterCamp);
        if (!this.getComponent(Kitchen)) this.addComponent(Kitchen);
        if (!this.getComponent(Fishing)) this.addComponent(Fishing);
        if (!this.getComponent(AdvancedFacilities)) this.addComponent(AdvancedFacilities);
        if (!this.getComponent(GenePanel)) this.addComponent(GenePanel);
        if (!this.getComponent(GameMenu)) this.addComponent(GameMenu);
        if (!this.getComponent(ColonyAudio)) this.addComponent(ColonyAudio);
        this.node.on('food-eaten', this.onEaten, this);
        this.node.on('queen-clicked', this.onQueenClicked, this);
        this.feeding.upgrades.node.on('upgrade-purchased', this.onUpgrade, this);
        this.feeding.upgrades.node.on('forager-food-changed', this.onForagerFood, this);
        this.node.on('evolution-chamber-clicked', this.openEvolution, this);
        game.on(Game.EVENT_HIDE, this.save, this);
        if (typeof window !== 'undefined') window.addEventListener('beforeunload', this.unload);
        if (!this.getComponent(ColonyTutorial)) this.addComponent(ColonyTutorial); if (!this.getComponent(WorldContinuity)) this.addComponent(WorldContinuity); if (!this.getComponent(OceanWaves)) this.addComponent(OceanWaves); if(!this.getComponent(RewardedAdSidebar))this.addComponent(RewardedAdSidebar); this.ready = true; this.refresh();
        this.scheduleOnce(() => this.hideStartupLoading(), 1.2);
    }

    private showStartupLoading(): void {
        const canvas = this.node.parent?.parent;
        const canvasTransform = canvas?.getComponent(UITransform);
        if (!canvas || !canvasTransform) return;
        const overlay = this.startupOverlay = new Node('StartupAssetLoading');
        overlay.layer = canvas.layer; canvas.addChild(overlay); overlay.setSiblingIndex(canvas.children.length - 1);
        overlay.addComponent(UITransform).setContentSize(420, 58);
        overlay.setPosition(0, -canvasTransform.height / 2 + 430, 0);
        const opacity = overlay.addComponent(UIOpacity); opacity.opacity = 255;
        const shade = overlay.addComponent(Graphics); shade.fillColor = new Color(50, 35, 25, 205);
        shade.lineWidth = 2; shade.strokeColor = new Color(197, 150, 102, 230);
        shade.roundRect(-210, -29, 420, 58, 18); shade.fill(); shade.stroke();
        const labelNode = new Node('Status'); labelNode.layer = overlay.layer; overlay.addChild(labelNode);
        labelNode.addComponent(UITransform).setContentSize(400, 54); labelNode.setPosition(0, 0);
        const label = this.startupLabel = labelNode.addComponent(Label); useDefaultSystemFont(label);
        label.string = '正在准备场景…'; label.fontSize = 26; label.isBold = true;
        label.color = new Color(255, 239, 207); label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
    }

    private hideStartupLoading(): void {
        const overlay = this.startupOverlay; this.startupOverlay = null; this.startupLabel = null;
        if (!overlay || !isValid(overlay, true)) return;
        const opacity = overlay.getComponent(UIOpacity);
        if (!opacity) { overlay.destroy(); return; }
        tween(opacity).to(.45, { opacity: 0 }).call(() => { if (isValid(overlay, true)) overlay.destroy(); }).start();
    }
    private unload = () => this.save();
    private onForagerFood(food: Food): void { if (this.feeding) this.feeding.foragerFood = food; }
    private openEvolution(): void { this.feeding?.upgrades?.openBuildingTab(3); }
    private onQueenClicked():void {this.feeding?.upgrades?.openBuildingTab(0);}
    private onUpgrade(event: { id: string }): void {
        if (["foragers_SpawnForager", "haulers_SpawnHauler", "gemini_SpawnGemini", "throwers_SpawnThrower"].includes(event.id)) this.history.noCarrier = false; if (event.id === "queen_SpawnLarvae") this.history.larvaePurchases++;
        const page: Record<string, number> = { evolution_BuildingGemini: 9, evolution_BuildingCuisine: 10, evolution_BuildingMine: 11, evolution_BuildingFishing: 12, evolution_BuildingTunnellers: TUNNELLER_TAB_INDEX };
        if (page[event.id]) { this.feeding?.upgrades?.selectTab(page[event.id]); this.feeding?.upgrades?.open(); }
        if (event.id === 'queen_Rebirth') { this.rebirthWorkers(); return; }
        if (event.id === 'evolution_Calcul') this.getComponent(EvolutionChamber)?.grow();
        if (event.id === 'queen_BuildingEvolutionChamber') this.openEvolution();
        if (event.id === 'evolution_BuildingOrchard') { this.feeding?.upgrades?.selectTab(4); this.feeding?.upgrades?.open(); }
        if (event.id === 'foragers_ApplesForaging') this.feeding?.upgrades?.selectForagerFood(Food.Apple);
        if (event.id === 'evolution_BuildingFarm') { this.feeding?.upgrades?.selectTab(5); this.feeding?.upgrades?.open(); }
        if (event.id === 'evolution_BuildingMushrooms') { this.feeding?.upgrades?.selectTab(6); this.feeding?.upgrades?.open(); }
        if (event.id === 'evolution_BuildingThrowers') { this.feeding?.upgrades?.selectTab(7); this.feeding?.upgrades?.open(); }
        if (event.id === 'evolution_BuildingHunters') { this.feeding?.upgrades?.selectTab(8); this.feeding?.upgrades?.open(); }
        this.save();
    }
    private onEaten(event: { nutrients: number }): void { this.totalNutrition += event.nutrients; playerMeta.peak = Math.max(playerMeta.peak, event.nutrients);[100, 1000, 10000, 100000, 1000000].forEach((v, i) => { if (event.nutrients >= v) unlockAchievement('treat_' + (i + 1)); }); this.queen?.eat(); }
    update(dt: number): void {
        if (!this.ready || !this.feeding?.upgrades) return;
        this.playSeconds += dt; this.second += dt; this.saveSeconds += dt;
        while (this.second >= 1) {
            this.second--;
            const result = this.progression.tick(this.feeding.window.rate);
            if (result.queen) {
                const u = this.feeding.upgrades.upgradeState, q = this.progression.queenLevel; if (q === 4 && this.history.noCarrier) unlockAchievement('no_carrier'); if (q === 5 && this.history.larvaePurchases <= 10) unlockAchievement('lean'); if (q === 7 && !u.level('evolution_BuildingMine')) unlockAchievement('diamond');
                const due = this.playSeconds + 6.05;
                this.pendingRewards.push(due);
                this.morphRewards.set(this.progression.queenLevel, due);
                this.queen?.levelUp(this.progression.queenLevel);
                if (preferences.collapseOnLevel) this.feeding.upgrades.close();
            }
            if (result.dna) this.queen?.play('Brain');
            this.refresh();
        }
        // Restored saves already show the upgraded queen. Resume their unclaimed
        // rewards; live morphs must wait for their actual animation completion.
        for (let i = 0; i < this.pendingRewards.length;) {
            const due = this.pendingRewards[i];
            if (due > this.playSeconds || [...this.morphRewards.values()].includes(due)) { i++; continue; }
            this.pendingRewards.splice(i, 1);
            this.releaseQueenReward();
            this.save();
        }
        if (this.saveSeconds >= 30) { this.saveSeconds = 0; if (preferences.autosave) this.save(); }
    }
    private onQueenMorphComplete(level: number): void {
        const due = this.morphRewards.get(level);
        if (due === undefined) return;
        this.morphRewards.delete(level);
        if (!this.ready) return; // Resume through pendingRewards if a transition fails.
        const index = this.pendingRewards.indexOf(due);
        if (index < 0) return;
        this.pendingRewards.splice(index, 1);
        this.releaseQueenReward();
        this.save();
    }
    private releaseQueenReward(): void {
        const panel = this.feeding!.upgrades!, state = panel.upgradeState, w = state.resources;
        const target = this.getComponent(EvolutionChamber)?.deliveryPosition;
        const larvae = w.larvae + (state.level('queen_Nursery') ? 2 : 0) + (this.genes.flags.providence ? 5 : 0);
        if (target && this.greyMatter) {
            const mouth = this.queen!.node.getChildByName('mouth') || this.queen!.node;
            const start = this.node.getComponent(UITransform)!.convertToNodeSpaceAR(mouth.worldPosition);
            start.add(new Vec3(1, 40, 0));
            this.greyMatter.launch(start, target);
            panel.setResources(w.nutrients, larvae, w.greyMatter);
        } else panel.setResources(w.nutrients, larvae, w.greyMatter + 1);
    }
    private onGreyMatterArrived(): void {
        this.getComponent(EvolutionChamber)?.grow();
        playOriginalSound('resource_get');
        this.save();
    }
    private onGreyMatterDelivered(): void {
        const panel = this.feeding!.upgrades!, w = panel.upgradeState.resources;
        panel.setResources(w.nutrients, w.larvae, w.greyMatter + 1);
        this.save();
    }
    private refresh(): void {
        if (!this.feeding?.upgrades) return;
        const level = this.progression.queenLevel;
        this.feeding.queenLevel = level; this.feeding.upgrades.upgradeState.queenLevel = level;
        this.feeding.tastes.options.dnaLevel = this.progression.dnaLevel;
        const larvae = this.getComponent(LarvaPopulation); if (larvae) larvae.queenLevel = level;
        this.feeding.hud?.setStatus(this.progression.status);
    }
    public refreshRewardState():void { this.refresh(); }
    public get canReturnToMain():boolean { return this.ready && !this.isDeparting; }
    public returnToMain():boolean {
        if (!this.canReturnToMain || !this.save()) return false;
        this.ready = false;
        requestMainMenu();
        const loading = director.loadScene('Main', error => {
            if (error) {
                consumeMainMenuRequest();
                if (isValid(this, true)) this.ready = true;
                console.error('Return to Main failed', error);
            }
        });
        if (!loading) { consumeMainMenuRequest(); this.ready = true; return false; }
        return true;
    }
    public save(): boolean {
        if (!this.ready || !this.feeding?.upgrades) return false;
        try {
            const p = this.progression;
            savePlayerMeta();
            const payload = {
                advanced: this.getComponent(AdvancedFacilities)?.snapshot(), continuity: this.getComponent(WorldContinuity)?.snapshot(), history: { ...this.history }, upgrades: this.feeding.upgrades.upgradeState.snapshot(), progression: { queenLevel: p.queenLevel, dnaLevel: p.dnaLevel, dna: p.dna },
                tastes: { ...this.feeding.tastes.state }, ledger: this.feeding.window.snapshot(), playSeconds: this.playSeconds, totalNutrition: this.totalNutrition,
                greyMatterFlights: this.greyMatter?.snapshot(), evolution: this.getComponent(EvolutionChamber)?.snapshot(),
                genes: this.genes.snapshot(),feastCharges:this.feeding.tastes.feastCharges, kitchen: this.getComponent(Kitchen)?.snapshot(), fishing: this.getComponent(Fishing)?.snapshot(), pendingRewards: [...this.pendingRewards], orchard: this.getComponent(Orchard)?.snapshot(), farm: this.getComponent(AphidFarm)?.snapshot(), mushrooms: this.getComponent(MushroomLab)?.snapshot(), throwers: this.getComponent(ThrowerDen)?.snapshot(), hunters: this.getComponent(HunterCamp)?.snapshot(), foodWorld: this.feeding.snapshotWorld()
            };
            const pending = this.feeding.pendingInputs(); for (const [name, foods] of Object.entries(pending)) { if (name === "Kitchen" && payload.kitchen) for (const [food, count] of Object.entries(foods)) payload.kitchen.inputs[+food] = Math.max(0, (payload.kitchen.inputs[+food] || 0) - count); if (name === "FishingDock" && payload.fishing) payload.fishing.bait = Math.max(0, payload.fishing.bait - Object.values(foods).reduce((a, b) => a + b, 0)); if (name === "HunterCamp" && payload.hunters) payload.hunters.bait = Math.max(0, (payload.hunters.bait || 0) - Object.values(foods).reduce((a, b) => a + b, 0)); }
            colonySave.save(payload);
            return true;
        } catch (error) { console.error('Colony save failed', error); return false; }
    }
    public applyGenes(ids: string[]): boolean {
        const hadCare = this.genes.flags.care_package;
        if (!this.genes.apply(ids)) return false;
        const panel = this.feeding!.upgrades!; panel.upgradeState.genes = this.genes.flags;
        if (!hadCare && this.genes.flags.care_package) { const w = panel.upgradeState.resources, gift = this.progression.dnaLevel * 1000 * Math.max(1, this.genes.run / 2) * (this.progression.dnaLevel >= 16 ? 100 : 1) * 100; panel.setResources(w.nutrients + gift, w.larvae, w.greyMatter); if (this.progression.dnaLevel >= 16) unlockAchievement('destiny'); }
        panel.node.emit('genes-changed'); panel.node.emit('upgrade-purchased', { id: 'genes_changed' }); panel.refresh(); this.save(); return true;
    }
    private rebirthWorkers(): void {
        unlockAchievement('rebirthed');
        const panel = this.feeding!.upgrades!, state = panel.upgradeState, data = state.snapshot(); let larvae = 0, grey = 0;
        for (const id of ['foragers_SpawnForager', 'haulers_SpawnHauler', 'gemini_SpawnGemini', 'throwers_SpawnThrower', 'hunters_SpawnHunter', 'hunters_SpawnBGH', 'mushrooms_SpawnMycologist', 'tunnellers_tunneller']) {
            const n = data.levels[id] || 0; larvae += n; if (id === 'hunters_SpawnBGH' || id === 'tunnellers_tunneller') grey += n; data.levels[id] = 0;
        }
        data.wallet.larvae += larvae; data.totalLarvae = (data.totalLarvae || 0) + larvae; data.wallet.greyMatter += grey;
        // Authoritative levels are committed after the original shrinking phase.
        this.ready = false; panel.close();
        for (const actor of this.node.getComponent(WorldLayers)!.actors.children) if (actor.getComponent('Hauler') || actor.getComponent('Forager') || actor.getComponent('Thrower') || /^(Hunter\d|GiantHunter|Mycologist)/.test(actor.name)) tween(actor).to(.5 + Math.random() * 4.5, { scale: new Vec3(0, 0, 1) }).start();
        this.scheduleOnce(() => { this.feeding!.clearDiscoveredBushes(); state.restore(data); this.ready = true; if (this.save()) { this.ready = false; loadGameThroughLoading(); } }, 5.05);
    }
    public newColony(): void {
        if (!this.ready || this.isDeparting) return;
        // User invokes this only after the in-game confirmation. Preserve permanent DNA.
        if (!this.save()) return;
        unlockAchievement('departure'); if (this.playSeconds <= 600) unlockAchievement('nevermind');
        this.isDeparting = true;
        // Prepare during the original ten-second departure; never insert a loading screen.
        const nextScene = loadGameScene().then(scene => ({ scene, error: null }), error => ({ scene: null, error }));
        const cinematic = this.getComponent(ColonyCinematics) || this.addComponent(ColonyCinematics);
        this.feeding!.upgrades!.close();
        cinematic.depart(async () => {
            const previous = colonySave.load();
            let committed = false;
            try {
                const next = await nextScene;
                if (!isValid(this, true)) return;
                if (next.error || !next.scene) throw next.error || new Error('Missing new colony scene');
                this.ready = false;
                const total = this.progression.dnaLevel, genes = new GeneModel();
                genes.restore(this.genes.snapshot()); genes.nextColony(total);
                const state = new UpgradeState();
                state.setResources({ nutrients: total * 1000 * (total >= 16 ? 100 : 1), larvae: 0, greyMatter: 0 });
                colonySave.save({ upgrades: state.snapshot(), genes: genes.snapshot(), progression: { queenLevel: 0, dnaLevel: total, dna: 0 },
                    tastes: { ...new FeedingModel().state }, ledger: new FeedingRateLedger().snapshot(), playSeconds: 0, totalNutrition: 0 });
                committed = true;
                requestGameFadeIn();
                director.runScene(next.scene);
            } catch (error) {
                cancelGameFadeIn();
                if (committed && previous) colonySave.save(previous);
                if (isValid(this, true)) { this.ready = true; this.isDeparting = false; cinematic.end(); }
                console.error('New colony failed', error);
            }
        });
    }
    onDestroy(): void {
        if (this.queen && isValid(this.queen.node, true))
            this.queen.node.off('queen-morph-complete', this.onQueenMorphComplete, this);
        this.node.off('grey-matter-arrived', this.onGreyMatterArrived, this);
        this.node.off('grey-matter-delivered', this.onGreyMatterDelivered, this);
        this.node.off('queen-clicked', this.onQueenClicked, this);
        game.off(Game.EVENT_HIDE, this.save, this); if (typeof window !== 'undefined') window.removeEventListener('beforeunload', this.unload);
        this.node.off('food-eaten', this.onEaten, this); this.node.off('evolution-chamber-clicked', this.openEvolution, this);
        this.feeding?.upgrades?.node.off('upgrade-purchased', this.onUpgrade, this);
        this.feeding?.upgrades?.node.off('forager-food-changed', this.onForagerFood, this);
    }
}
