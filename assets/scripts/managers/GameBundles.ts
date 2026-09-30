import { Asset, AssetManager, assetManager, SceneAsset } from 'cc';

type AssetType<T extends Asset> = new (...args: any[]) => T;
type Progress = (completed: number, total: number) => void;
const pending = new Map<string, Promise<AssetManager.Bundle>>();

/** Local gameplay subpackage and optional remote music; failures may be retried. */
export function loadGameBundle(name = 'gameplay'): Promise<AssetManager.Bundle> {
    const loaded = assetManager.getBundle(name);
    if (loaded) return Promise.resolve(loaded);
    let request = pending.get(name);
    if (!request) {
        request = new Promise<AssetManager.Bundle>((resolve, reject) => {
            assetManager.loadBundle(name, (error, bundle) => {
                if (error || !bundle) reject(error || new Error(`Missing bundle: ${name}`));
                else resolve(bundle);
            });
        });
        pending.set(name, request);
        void request.then(() => pending.delete(name), () => pending.delete(name));
    }
    return request;
}

/** Same relative asset paths as before the resources folder was split. */
export const gameResources = {
    load<T extends Asset>(path: string, type: AssetType<T>, complete: (error: Error | null, asset: T) => void): void {
        void loadGameBundle().then(bundle => bundle.load(path, type, complete),
            error => complete(error, null as unknown as T));
    },
    loadDir<T extends Asset>(path: string, type: AssetType<T>, progress: Progress,
        complete: (error: Error | null, assets: T[]) => void): void {
        void loadGameBundle().then(bundle => bundle.loadDir(path, type, progress, complete),
            error => complete(error, []));
    },
};

export async function loadGameScene(progress?: Progress): Promise<SceneAsset> {
    const bundle = await loadGameBundle();
    return new Promise((resolve, reject) => {
        bundle.loadScene('Game', progress || null, (error, scene) => {
            if (error) reject(error);
            else resolve(scene);
        });
    });
}

export async function loadMusicClip<T extends Asset>(path: string, type: AssetType<T>): Promise<T> {
    const bundle = await loadGameBundle('music');
    return new Promise((resolve, reject) => bundle.load(path, type, (error, asset) => {
        if (error) reject(error);
        else resolve(asset);
    }));
}
