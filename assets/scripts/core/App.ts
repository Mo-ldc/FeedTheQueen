import { MessageManager } from "../managers/MessageManager";
import { ObjectPoolManager } from "../managers/ObjectPoolManager";
import { ResourceManager } from "../managers/ResourceManager";
import { UIManager } from "../managers/UIManager";


/**
 * Application service entry point.
 *
 * Use `App.instance` from gameplay and UI scripts instead of importing each
 * manager separately. Every manager remains lazily constructed: accessing App
 * alone does not create any manager.
 */
export class App {
    private static _instance: App | null = null;

    public static get instance(): App {
        if (!this._instance) {
            this._instance = new App();
        }
        return this._instance;
    }

    private constructor() { }


    public get UIManager(): UIManager {
        return UIManager.instance;
    }

    public get MessageManager(): MessageManager {
        return MessageManager.instance;
    }

    public get ObjectPoolManager(): ObjectPoolManager {
        return ObjectPoolManager.instance;
    }

    public get ResourceManager(): ResourceManager {
        return ResourceManager.instance;
    }
}
