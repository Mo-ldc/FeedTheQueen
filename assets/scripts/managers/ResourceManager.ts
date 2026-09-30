import { Asset, AssetManager, assetManager, Prefab } from 'cc';
import { loadGameBundle } from './GameBundles';

type AssetConstructor<T extends Asset> = new (...args: any[]) => T;

interface CachedAsset {
    asset: Asset;
    references: number;
}

/**
 * Promise-based dynamic asset loader with reference-counted release.
 * Paths in the default `gameplay` bundle are relative to `assets/gameplay`.
 */
export class ResourceManager {
    private static _instance: ResourceManager | null = null;
    private readonly _cache = new Map<string, CachedAsset>();
    private readonly _pending = new Map<string, Promise<Asset>>();

    /** Lazily created global resource manager. */
    public static get instance(): ResourceManager {
        if (!this._instance) {
            this._instance = new ResourceManager();
        }
        return this._instance;
    }

    private constructor() {}

    public async load<T extends Asset>(path: string, type: AssetConstructor<T>, bundleName = 'gameplay'): Promise<T> {
        const key = this.keyOf(bundleName, path);
        const cached = this._cache.get(key);
        if (cached) {
            cached.references += 1;
            return cached.asset as T;
        }

        let pending = this._pending.get(key);
        if (!pending) {
            pending = this.loadFromBundle(path, type, bundleName);
            this._pending.set(key, pending);
            try {
                const asset = await pending;
                this._cache.set(key, { asset, references: 0 });
            } finally {
                this._pending.delete(key);
            }
        }

        const asset = await pending;
        const entry = this._cache.get(key);
        if (!entry) {
            // The first caller may have completed before the cache was populated.
            this._cache.set(key, { asset, references: 1 });
        } else {
            entry.references += 1;
        }
        return asset as T;
    }

    public loadPrefab(path: string, bundleName = 'gameplay'): Promise<Prefab> {
        return this.load(path, Prefab, bundleName);
    }

    public release(path: string, bundleName = 'gameplay'): void {
        const key = this.keyOf(bundleName, path);
        const entry = this._cache.get(key);
        if (!entry) {
            return;
        }

        entry.references -= 1;
        if (entry.references > 0) {
            return;
        }

        assetManager.releaseAsset(entry.asset);
        this._cache.delete(key);
    }

    public releaseAll(): void {
        this._cache.forEach((entry) => assetManager.releaseAsset(entry.asset));
        this._cache.clear();
    }

    private async loadFromBundle<T extends Asset>(path: string, type: AssetConstructor<T>, bundleName: string): Promise<T> {
        const bundle = await this.getBundle(bundleName);
        return new Promise<T>((resolve, reject) => {
            bundle.load(path, type, (error, asset) => {
                if (error) {
                    reject(new Error(`无法加载资源 ${bundleName}/${path}: ${error.message}`));
                    return;
                }
                resolve(asset as T);
            });
        });
    }

    private async getBundle(bundleName: string): Promise<AssetManager.Bundle> {
        if (bundleName === 'resources' || bundleName === 'gameplay') {
            return loadGameBundle();
        }

        const loadedBundle = assetManager.getBundle(bundleName);
        if (loadedBundle) {
            return loadedBundle;
        }

        return new Promise<AssetManager.Bundle>((resolve, reject) => {
            assetManager.loadBundle(bundleName, (error, bundle) => {
                if (error || !bundle) {
                    reject(new Error(`无法加载资源包 ${bundleName}: ${error?.message ?? '未找到资源包'}`));
                    return;
                }
                resolve(bundle);
            });
        });
    }

    private keyOf(bundleName: string, path: string): string {
        return `${bundleName}:${path}`;
    }
}
