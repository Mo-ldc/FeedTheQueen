export type MainPromotion = 'Entry' | 'Share' | 'Desktop';

/** Shared by the authored reward display and the publisher SDK request. */
export const MAIN_PROMOTION_REWARDS = {
    Entry: { placement: 'main_entry_reward', rewardType: 'larvae', rewardAmount: 2, rewardUnit: '幼虫' },
    Share: { placement: 'main_share', rewardType: 'larvae', rewardAmount: 1, rewardUnit: '幼虫' },
    Desktop: { placement: 'main_add_desktop', rewardType: 'nutrients', rewardAmount: 1000, rewardUnit: '营养' },
} as const;
