import { director } from 'cc';
import { loadGameScene } from '../managers/GameBundles';

let fadeIntoNextGame = false;
let mainMenuRequested = false;

/** A one-shot navigation flag, deliberately not persisted across app launches. */
export function requestMainMenu(): void { mainMenuRequested = true; }
export function consumeMainMenuRequest(): boolean {
    const requested = mainMenuRequested;
    mainMenuRequested = false;
    return requested;
}

/** Carry the original screen-fader transition across the new-colony scene reload. */
export function requestGameFadeIn(): void { fadeIntoNextGame = true; }
export function consumeGameFadeIn(): boolean {
    const requested = fadeIntoNextGame;
    fadeIntoNextGame = false;
    return requested;
}
export function cancelGameFadeIn(): void { fadeIntoNextGame = false; }

/** Route every game restart through the lightweight preload screen. */
export function loadGameThroughLoading(): void {
    director.loadScene('Loading', (error) => {
        if (!error) return;
        console.error('Loading scene unavailable; loading Game directly', error);
        void loadGameScene().then(scene => director.runScene(scene)).catch(console.error);
    });
}
