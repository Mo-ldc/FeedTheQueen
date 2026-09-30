import { DynamicAtlasManager, Game, game, macro } from 'cc';
import { EDITOR, PREVIEW } from 'cc/env';

// Run before scene assets load: mini-game platforms otherwise discard the source
// images that the atlas needs. Bound the atlas allocation to two 2048px pages.
if (!EDITOR || PREVIEW) game.once(Game.EVENT_ENGINE_INITED, () => {
    macro.CLEANUP_IMAGE_CACHE = false;
    const atlas = DynamicAtlasManager.instance;
    atlas.maxAtlasCount = 2;
    atlas.maxFrameSize = 512;
    atlas.enabled = true;
});
