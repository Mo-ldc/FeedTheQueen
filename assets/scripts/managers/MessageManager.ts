/** A small, typed publish/subscribe bus for game-wide messages. */
export type MessageHandler<T = unknown> = (payload: T) => void;

export class MessageManager {
    private static _instance: MessageManager | null = null;
    private readonly _listeners = new Map<string, Set<MessageHandler>>();

    /** Lazily created global message manager. */
    public static get instance(): MessageManager {
        if (!this._instance) {
            this._instance = new MessageManager();
        }
        return this._instance;
    }

    private constructor() {}

    public on<T>(message: string, handler: MessageHandler<T>): () => void {
        let listeners = this._listeners.get(message);
        if (!listeners) {
            listeners = new Set<MessageHandler>();
            this._listeners.set(message, listeners);
        }

        listeners.add(handler as MessageHandler);
        return () => this.off(message, handler);
    }

    public once<T>(message: string, handler: MessageHandler<T>): () => void {
        const unsubscribe = this.on<T>(message, (payload) => {
            unsubscribe();
            handler(payload);
        });
        return unsubscribe;
    }

    public off<T>(message: string, handler?: MessageHandler<T>): void {
        const listeners = this._listeners.get(message);
        if (!listeners) {
            return;
        }

        if (handler) {
            listeners.delete(handler as MessageHandler);
        } else {
            listeners.clear();
        }

        if (listeners.size === 0) {
            this._listeners.delete(message);
        }
    }

    public emit<T>(message: string, payload: T): void {
        const listeners = this._listeners.get(message);
        if (!listeners) {
            return;
        }

        // Copy first: a handler may safely unsubscribe itself while receiving.
        [...listeners].forEach((handler) => handler(payload));
    }

    public clear(): void {
        this._listeners.clear();
    }
}
