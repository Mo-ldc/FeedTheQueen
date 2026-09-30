import { Canvas, Component, director, Director, instantiate, isValid, Node, Prefab, UITransform } from 'cc';
import { ResourceManager } from './ResourceManager';

export enum UILayer {
    Normal = 'Normal',
    Popup = 'Popup',
    Overlay = 'Overlay',
}

export class UIView extends Component {
    /** Override in a concrete panel to receive the value passed to UIManager.open. */
    public onShow(_params?: unknown): void {}

    /** Override for cleanup that is specific to the panel. */
    public onHide(): void {}
}

type UIConstructor<T extends UIView> = new (...args: any[]) => T;

export interface UIConfig<T extends UIView> {
    id: string;
    path: string;
    component: UIConstructor<T>;
    bundleName?: string;
    layer?: UILayer;
    destroyOnClose?: boolean;
}

interface OpenedUI {
    node: Node;
    view: UIView;
    config: UIConfig<UIView>;
}

/** Creates UI prefab instances below the Canvas of the current scene. */
export class UIManager {
    private static _instance: UIManager | null = null;
    private readonly _opened = new Map<string, OpenedUI>();
    private readonly _layers = new Map<UILayer, Node>();
    private _root: Node | null = null;
    private _initialized = false;

    /** Lazily created global UI manager. */
    public static get instance(): UIManager {
        if (!this._instance) {
            this._instance = new UIManager();
        }
        return this._instance;
    }

    private constructor() {}

    public initialize(): void {
        if (this._initialized) {
            return;
        }
        this._initialized = true;
        director.on(Director.EVENT_AFTER_SCENE_LAUNCH, this.onSceneLaunched, this);
    }

    public async open<T extends UIView>(config: UIConfig<T>, params?: unknown): Promise<T> {
        this.initialize();
        const opened = this._opened.get(config.id);
        if (opened && isValid(opened.node, true)) {
            opened.node.active = true;
            opened.view.onShow(params);
            return opened.view as T;
        }

        const prefab = await ResourceManager.instance.loadPrefab(config.path, config.bundleName);
        const node = instantiate(prefab);
        const view = node.getComponent(config.component) ?? node.getComponentInChildren(config.component);
        if (!view) {
            node.destroy();
            ResourceManager.instance.release(config.path, config.bundleName);
            throw new Error(`UI ${config.id} 的预制体未挂载 ${config.component.name}。`);
        }

        this.getLayer(config.layer ?? UILayer.Normal).addChild(node);
        const storedConfig = config as unknown as UIConfig<UIView>;
        this._opened.set(config.id, { node, view, config: storedConfig });
        view.onShow(params);
        return view;
    }

    public close(id: string): void {
        const opened = this._opened.get(id);
        if (!opened) {
            return;
        }

        opened.view.onHide();
        if (opened.config.destroyOnClose === false) {
            opened.node.active = false;
            return;
        }

        opened.node.destroy();
        ResourceManager.instance.release(opened.config.path, opened.config.bundleName);
        this._opened.delete(id);
    }

    public get<T extends UIView>(id: string): T | null {
        return (this._opened.get(id)?.view as T | undefined) ?? null;
    }

    public closeAll(): void {
        [...this._opened.keys()].forEach((id) => this.close(id));
    }

    public dispose(): void {
        this.closeAll();
        if (this._initialized) {
            director.off(Director.EVENT_AFTER_SCENE_LAUNCH, this.onSceneLaunched, this);
        }
        this._layers.clear();
        this._root = null;
        this._initialized = false;
    }

    private onSceneLaunched(): void {
        // Scene-owned UI is destroyed during the transition; discard stale references.
        this._opened.forEach((opened) => {
            ResourceManager.instance.release(opened.config.path, opened.config.bundleName);
        });
        this._opened.clear();
        this._layers.clear();
        this._root = null;
    }

    private getLayer(layer: UILayer): Node {
        this.ensureRoot();
        return this._layers.get(layer)!;
    }

    private ensureRoot(): void {
        if (this._root && isValid(this._root, true)) {
            return;
        }

        const canvas = this.findCanvas(director.getScene());
        if (!canvas) {
            throw new Error('当前场景没有 Canvas，无法打开 UI。');
        }

        const root = new Node('UIRoot');
        root.layer = canvas.layer;
        const sourceTransform = canvas.getComponent(UITransform);
        const rootTransform = root.addComponent(UITransform);
        if (sourceTransform) {
            rootTransform.setContentSize(sourceTransform.contentSize);
            rootTransform.setAnchorPoint(sourceTransform.anchorPoint);
        }
        canvas.addChild(root);
        this._root = root;

        // Build all layers in z-order once, so opening a normal panel after a
        // popup can never accidentally place it above that popup.
        [UILayer.Normal, UILayer.Popup, UILayer.Overlay].forEach((layer) => {
            const layerNode = new Node(`${layer}Layer`);
            layerNode.layer = root.layer;
            root.addChild(layerNode);
            this._layers.set(layer, layerNode);
        });
    }

    private findCanvas(node: Node | null): Node | null {
        if (!node) {
            return null;
        }
        if (node.getComponent(Canvas)) {
            return node;
        }
        for (const child of node.children) {
            const canvas = this.findCanvas(child);
            if (canvas) {
                return canvas;
            }
        }
        return null;
    }
}
