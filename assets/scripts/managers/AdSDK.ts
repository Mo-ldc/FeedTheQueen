/**
 * Platform-facing ad and analytics boundary.
 *
 * The game calls this class only. A publisher supplies an AdSDKAdapter that
 * forwards these calls to the SDK selected for the release platform. This
 * module deliberately does not import, initialize, or bundle a vendor SDK.
 */
export type AnalyticsData = Record<string, unknown>;

export interface RewardedAdRequest {
    /** Stable placement key chosen by the game, for example "offline_bonus". */
    placement: string;
    scene?: string;
    rewardType?: string;
    rewardAmount?: number;
    rewardUnit?: string;
    /** Extra fields forwarded to analytics and the publisher adapter. */
    data?: AnalyticsData;
}

export interface RewardedAdCallbacks {
    /** Called after video completion, or immediately in a test build without an adapter. */
    onRewarded: () => void;
    /** Called when the video cannot be shown or was not completed. */
    onFailed: (reason: string) => void;
}

/** Main-menu platform action; reward configuration is managed separately. */
export interface PlatformActionRequest {
    placement: string;
    scene?: string;
    /** Configured reward; the adapter must still verify platform eligibility. */
    rewardType?: 'larvae' | 'nutrients';
    rewardAmount?: number;
    rewardUnit?: string;
    data?: AnalyticsData;
}

export interface PlatformActionResult {
    /** Optional platform receipt or context for later reward eligibility checks. */
    data?: AnalyticsData;
}

export interface PlatformActionCallbacks {
    /** Report the actual platform operation result, not a reward grant. */
    onSuccess: (result?: PlatformActionResult) => void;
    /** Includes cancellation, unsupported operations and SDK errors. */
    onFailed: (reason: string) => void;
}

type PlatformActionMethod = 'openSidebar' | 'shareApp' | 'addToDesktop';

export interface AdSDKAdapter {
    /** Forward to the platform rewarded-video API. Do not grant the game reward here. */
    showRewardedVideo(request: RewardedAdRequest, callbacks: RewardedAdCallbacks): void;
    /** Forward the named event and payload to the platform analytics API. */
    reportAnalytics(eventName: string, data: AnalyticsData): void;
    /** Open the platform sidebar. Success does not prove a rewarded sidebar re-entry. */
    openSidebar?(request: PlatformActionRequest, callbacks: PlatformActionCallbacks): void;
    /** Invoke the platform sharing flow and report its outcome. */
    shareApp?(request: PlatformActionRequest, callbacks: PlatformActionCallbacks): void;
    /** Invoke the platform add-to-desktop flow and report its outcome. */
    addToDesktop?(request: PlatformActionRequest, callbacks: PlatformActionCallbacks): void;
}

export default class AdSDK {
    private static adapter: AdSDKAdapter | null = null;

    /**
     * Register the publisher's bridge after their platform SDK is ready.
     * This only installs a delegate; it does not initialize any SDK.
     */
    public static setAdapter(adapter: AdSDKAdapter | null): void {
        this.adapter = adapter;
    }

    public static openSidebar(request: PlatformActionRequest, callbacks: PlatformActionCallbacks): void {
        this.performPlatformAction('openSidebar', request, callbacks);
    }

    public static shareApp(request: PlatformActionRequest, callbacks: PlatformActionCallbacks): void {
        this.performPlatformAction('shareApp', request, callbacks);
    }

    public static addToDesktop(request: PlatformActionRequest, callbacks: PlatformActionCallbacks): void {
        this.performPlatformAction('addToDesktop', request, callbacks);
    }

    private static performPlatformAction(method: PlatformActionMethod, request: PlatformActionRequest, callbacks: PlatformActionCallbacks): void {
        const adapter = this.adapter, handler = adapter?.[method];
        // Unlike rewarded-video preview, these actions must never simulate success.
        if (!adapter || !handler) { callbacks.onFailed(adapter ? 'unsupported' : 'not_configured'); return; }
        let settled = false;
        const event = {
            ...request.data, placement: request.placement, scene: request.scene, action: method,
            rewardType: request.rewardType, rewardAmount: request.rewardAmount, rewardUnit: request.rewardUnit
        };
        const finish = (success: boolean, result?: PlatformActionResult, reason?: string): void => {
            if (settled) return;
            settled = true;
            this.reportAnalytics('mainMenuActionResult', { ...event, result: success ? 'success' : 'failure', reason });
            if (success) callbacks.onSuccess(result);
            else callbacks.onFailed(reason || 'failed');
        };
        this.reportAnalytics('mainMenuActionClick', event);
        try {
            handler.call(adapter, request, {
                onSuccess: result => finish(true, result),
                onFailed: reason => finish(false, undefined, reason),
            });
        } catch (error) {
            finish(false, undefined, error instanceof Error ? error.message : String(error));
        }
    }

    /** Request a rewarded video. The caller grants the in-game reward in onRewarded. */
    public static showRewardedVideo(request: RewardedAdRequest, callbacks: RewardedAdCallbacks): void {
        const adapter = this.adapter;
        if (!adapter) {
            // Builds without a publisher bridge are test builds on every platform.
            // Use the normal grant callback so reward amounts, refresh and saving agree.
            callbacks.onRewarded();
            return;
        }

        let settled = false;
        const finish = (callback: () => void): void => {
            if (settled) return;
            settled = true;
            callback();
        };

        this.reportAnalytics('rewardAdClick', this.adEventData(request));
        try {
            adapter.showRewardedVideo(request, {
                onRewarded: () => finish(() => {
                    this.reportAnalytics('rewardAdResult', {
                        ...this.adEventData(request),
                        result: 'success',
                    });
                    callbacks.onRewarded();
                }),
                onFailed: (reason: string) => finish(() => {
                    this.reportAnalytics('rewardAdResult', {
                        ...this.adEventData(request),
                        result: 'failure',
                        reason,
                    });
                    callbacks.onFailed(reason);
                }),
            });
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            finish(() => {
                this.reportAnalytics('rewardAdResult', {
                    ...this.adEventData(request),
                    result: 'failure',
                    reason,
                });
                callbacks.onFailed(reason);
            });
        }
    }

    /** Generic analytics entry point for game, UI, economy, and progression events. */
    public static reportAnalytics(eventName: string, data: AnalyticsData = {}): void {
        try {
            this.adapter?.reportAnalytics(eventName, data);
        } catch (error) {
            // A platform analytics outage must not interrupt game flow.
            console.warn('[AdSDK] Analytics forwarding failed:', error);
        }
    }

    /** Call after the game has actually granted the reward to the player. */
    public static reportRewardAdGrant(request: RewardedAdRequest): void {
        this.reportAnalytics('rewardAdGrant', this.adEventData(request));
    }

    private static adEventData(request: RewardedAdRequest): AnalyticsData {
        return {
            placement: request.placement,
            scene: request.scene,
            rewardType: request.rewardType,
            rewardAmount: request.rewardAmount,
            rewardUnit: request.rewardUnit,
            ...(request.data || {}),
        };
    }
}
