import { _decorator, Component, Prefab, Node, instantiate, UIOpacity, tween } from 'cc';
import { gameResources as resources } from '../managers/GameBundles';
const { ccclass, property } = _decorator;

/** Scene-owned asset references keep editable prefabs included in preview and builds. */
@ccclass('ColonyPrefabs')
export class ColonyPrefabs extends Component {
    @property([Prefab]) prefabs: Prefab[] = [];
    private readonly catalog = new Map<string, Prefab>();
    private initialFadeUntil = 0;

    /** Load optional world prefabs after the Game scene's core visuals are visible. */
    public loadCatalog(onProgress?: (completed: number, total: number) => void): Promise<void> {
        for (const prefab of this.prefabs) this.catalog.set(prefab.name, prefab);
        return new Promise((resolve, reject) => {
            resources.loadDir('prefabs', Prefab,
                (completed, total) => onProgress?.(completed, total),
                (error, prefabs) => {
                    if (error) { reject(error); return; }
                    for (const prefab of prefabs || []) this.catalog.set(prefab.name, prefab);
                    resolve();
                });
        });
    }

    /** Fetch a deliberately deferred prefab the first time its feature is opened. */
    public loadPrefab(name:string,path=`ui/lazy-prefabs/${name}`):Promise<void> {
        if(this.catalog.has(name))return Promise.resolve();
        return new Promise((resolve,reject)=>resources.load(path,Prefab,(error,prefab)=>{
            if(error){reject(error);return;}
            this.catalog.set(name,prefab);resolve();
        }));
    }

    /** Let startup-created buildings and workers appear after their assets resolve. */
    public beginStartupFade(): void { this.initialFadeUntil = Date.now() + 3000; }

    public create(name: string, parent: Node, instanceName = name): Node {
        const asset = this.catalog.get(name) || this.prefabs.find(p => p.name === name);
        if (!asset) throw new Error(`ColonyPrefabs: missing prefab ${name}`);
        const node = instantiate(asset);
        node.name = instanceName;
        const setLayer = (n: Node) => { n.layer = parent.layer; n.children.forEach(setLayer); };
        setLayer(node);
        parent.addChild(node);
        if (Date.now() < this.initialFadeUntil && parent.isChildOf(this.node)) {
            const opacity = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
            opacity.opacity = 0;
            tween(opacity).to(.65, { opacity: 255 }, { easing: 'quadOut' }).start();
        }
        return node;
    }
}
