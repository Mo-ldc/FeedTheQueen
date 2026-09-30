import { AudioClip, AudioSource, director, isValid, Node, sys } from 'cc';
import { gameResources as resources } from '../managers/GameBundles';
import { ORIGINAL_SOUNDS } from '../config/PresentationConfig';
import { preferences } from './PlayerMeta';

// Mini-games expose platform audio through Cocos, not browser AudioContext/fetch.
let webAudio = sys.isBrowser && typeof AudioContext === 'function' && typeof fetch === 'function';
let context: AudioContext | null = null;
let platformUnlocked = false;
let platformSource: AudioSource | null = null;
let channels = 0;
const clips = new Map<string, Promise<AudioClip>>();
const buffers = new Map<string, Promise<AudioBuffer>>();
const queue: { name: string; volume?: number }[] = [];
export const soundStats = { played: 0, pitch: 1, active: 0 };

export function unlockOriginalAudio(): void {
    if (!webAudio) {
        platformUnlocked = true;
        drain();
        return;
    }
    try {
        context ??= new AudioContext();
        void context.resume().then(drain).catch(usePlatformAudio);
        drain();
    } catch (error) {
        usePlatformAudio(error);
    }
}

function usePlatformAudio(error: unknown): void {
    console.warn('Web Audio unavailable; using Cocos audio', error);
    webAudio = false;
    platformUnlocked = true;
    drain();
}

export function playOriginalSound(name: string, volume?: number): void {
    if (!ORIGINAL_SOUNDS[name]) return;
    if (queue.length < 40) queue.push({ name, volume });
    drain();
}

function getPlatformSource(): AudioSource | null {
    if (platformSource && isValid(platformSource, true)) return platformSource;
    const scene = director.getScene();
    if (!scene) return null;
    const node = new Node('OriginalSoundPlayer');
    scene.addChild(node);
    platformSource = node.addComponent(AudioSource);
    platformSource.playOnAwake = false;
    platformSource.loop = false;
    platformSource.volume = 1;
    director.addPersistRootNode(node);
    return platformSource;
}

function loadClip(file: string): Promise<AudioClip> {
    let request = clips.get(file);
    if (!request) {
        request = new Promise<AudioClip>((resolve, reject) => {
            resources.load('original/audio/' + file.replace(/\.(mp3|wav)$/i, ''), AudioClip, (error, clip) => {
                if (error || !clip) { reject(error || new Error('Missing audio: ' + file)); return; }
                // The player survives scene changes, so retain its small effect cache.
                clip.addRef();
                resolve(clip);
            });
        });
        clips.set(file, request);
        void request.catch(() => clips.delete(file));
    }
    return request;
}

function loadBuffer(file: string, ctx: AudioContext): Promise<AudioBuffer> {
    let request = buffers.get(file);
    if (!request) {
        request = loadClip(file).then(clip => fetch(clip.nativeUrl)).then(response => {
            if (!response.ok) throw new Error('Audio ' + response.status);
            return response.arrayBuffer();
        }).then(bytes => ctx.decodeAudioData(bytes));
        buffers.set(file, request);
        void request.catch(() => buffers.delete(file));
    }
    return request;
}

function volumeFor(name: string, override?: number): number {
    const channel = /^(ui_|button_)/.test(name) ? preferences.uiSfx : preferences.sfx;
    const volume = (override ?? ORIGINAL_SOUNDS[name].volume) * preferences.master * channel;
    return Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0;
}

function drain(): void {
    if (webAudio ? !context || context.state !== 'running' : !platformUnlocked) return;
    const platform = webAudio ? null : getPlatformSource();
    if (!webAudio && !platform) return;
    // Leave room for the two music sources on platforms with limited channels.
    const limit = webAudio ? 40 : Math.max(1, Math.min(8, AudioSource.maxAudioChannel - 2));
    while (queue.length && channels < limit) {
        const item = queue.shift()!;
        if (!volumeFor(item.name, item.volume)) continue;
        const spec = ORIGINAL_SOUNDS[item.name];
        const file = spec.streams[Math.floor(Math.random() * spec.streams.length)];
        channels++;
        soundStats.active = channels;
        let released = false;
        const release = (): void => {
            if (released) return;
            released = true;
            channels--;
            soundStats.active = channels;
            drain();
        };
        const failed = (error: unknown): void => {
            console.error('Original sound ' + item.name, error);
            release();
        };
        if (webAudio) {
            const ctx = context!;
            void loadBuffer(file, ctx).then(decoded => {
                const volume = volumeFor(item.name, item.volume);
                if (!volume) { release(); return; }
                const source = ctx.createBufferSource(), gain = ctx.createGain();
                source.buffer = decoded;
                source.playbackRate.value = spec.pitch[0] + Math.random() * (spec.pitch[1] - spec.pitch[0]);
                gain.gain.value = volume;
                source.connect(gain); gain.connect(ctx.destination);
                source.onended = () => { source.disconnect(); gain.disconnect(); release(); };
                source.start();
                soundStats.played++;
                soundStats.pitch = source.playbackRate.value;
            }).catch(failed);
        } else {
            void loadClip(file).then(clip => {
                const volume = volumeFor(item.name, item.volume);
                if (!volume || !isValid(platform, true)) { release(); return; }
                platform!.playOneShot(clip, volume);
                soundStats.played++;
                // AudioSource has no portable pitch API; use original pitch on mini-games.
                soundStats.pitch = 1;
                // playOneShot has no public ended event; duration bounds our voice budget.
                const duration = clip.getDuration();
                setTimeout(release, Number.isFinite(duration) && duration > 0 ? duration * 1000 : 1000);
            }).catch(failed);
        }
    }
}
