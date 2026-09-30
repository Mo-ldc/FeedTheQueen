import { playerMeta, savePlayerMeta } from './PlayerMeta';
export interface SteamAchievementBridge {setAchievement(id:string):boolean|Promise<boolean>;storeStats():boolean|Promise<boolean>;}
let bridge:SteamAchievementBridge|null=null;let busy=false;
/** Host supplies its own authenticated Steamworks adapter; never invent an AppID. */
export function connectSteamAchievements(adapter:SteamAchievementBridge):void {bridge=adapter;void syncAchievements();}
export async function syncAchievements():Promise<void> {if(!bridge||busy)return;busy=true;try{const pending=playerMeta.achievements.filter(id=>!playerMeta.synced?.includes(id)),sent:string[]=[];for(const id of pending)if(await bridge.setAchievement(id))sent.push(id);if(sent.length&&await bridge.storeStats()){playerMeta.synced=[...new Set([...(playerMeta.synced||[]),...sent])];savePlayerMeta();}}catch(e){console.warn('Steam achievement sync pending',e);}finally{busy=false;}}
