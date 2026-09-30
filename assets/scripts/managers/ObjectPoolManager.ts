import { instantiate, isValid, Node, Prefab } from 'cc';

interface Pool {
    prefab: Prefab;
    available: Node[];
    maxSize: number;
}

/** Reuses short-lived scene nodes such as food, floating numbers and effects. */
export class ObjectPoolManager {
    private static _instance: ObjectPoolManager | null = null;
    private readonly _pools = new Map<string, Pool>();

    /** Lazily created global object-pool manager. */
    public static get instance(): ObjectPoolManager {
        if (!this._instance) {
            this._instance = new ObjectPoolManager();
        }
        return this._instance;
    }

    private constructor() {}

    public register(key: string, prefab: Prefab, initialSize = 0, maxSize = 32): void {
        this.unregister(key);
        const pool: Pool = { prefab, available: [], maxSize: Math.max(initialSize, maxSize) };
        this._pools.set(key, pool);

        for (let index = 0; index < initialSize; index += 1) {
            const node = instantiate(prefab);
            node.active = false;
            pool.available.push(node);
        }
    }

    public get(key: string, parent?: Node): Node {
        const pool = this._pools.get(key);
        if (!pool) {
            throw new Error(`对象池 ${key} 尚未注册。`);
        }

        let node: Node | undefined;
        while (pool.available.length > 0 && !node) {
            const candidate = pool.available.pop();
            if (candidate && isValid(candidate, true)) {
                node = candidate;
            }
        }

        const result = node ?? instantiate(pool.prefab);
        if (parent) {
            parent.addChild(result);
        }
        result.active = true;
        return result;
    }

    public put(key: string, node: Node): void {
        const pool = this._pools.get(key);
        if (!pool || !isValid(node, true)) {
            node.destroy();
            return;
        }

        node.removeFromParent();
        node.active = false;
        if (pool.available.length >= pool.maxSize) {
            node.destroy();
            return;
        }
        pool.available.push(node);
    }

    public clear(key: string): void {
        const pool = this._pools.get(key);
        if (!pool) {
            return;
        }
        pool.available.forEach((node) => node.destroy());
        pool.available.length = 0;
    }

    public unregister(key: string): void {
        this.clear(key);
        this._pools.delete(key);
    }

    public clearAll(): void {
        [...this._pools.keys()].forEach((key) => this.unregister(key));
    }
}
