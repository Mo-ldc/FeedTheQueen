import { Label, RichText } from 'cc';

/** Use Cocos' default Arial system font; CJK glyphs use the platform's fallback. */
export function useDefaultSystemFont(label: Label | RichText): void {
    label.useSystemFont = true;
    label.fontFamily = 'Arial';
    // Render each string independently. Shared character-atlas caching can
    // drop glyphs on the mini-game platform; this also covers RichText segments.
    label.cacheMode = Label.CacheMode.NONE;
}
