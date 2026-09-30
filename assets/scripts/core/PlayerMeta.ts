import { sys } from 'cc';
import { SaveRepository } from './SaveRepository';
export { ACHIEVEMENT_NAMES as ACHIEVEMENTS } from '../config/AchievementText';
import { ACHIEVEMENT_NAMES as ACHIEVEMENTS } from '../config/AchievementText';
export interface PlayerMeta {settings:{autosave:boolean;floating:boolean;camera:boolean;collapseOnLevel:boolean;timer:boolean;master:number;sfx:number;music:number;uiSfx:number};achievements:string[];manual:number;peak:number;tutorials?:number[];synced?:string[];}
const defaults:PlayerMeta={settings:{autosave:true,floating:true,camera:true,collapseOnLevel:true,timer:false,master:.5,sfx:.5,music:.5,uiSfx:.5},achievements:[],manual:0,peak:0};
const repository=new SaveRepository<PlayerMeta>(sys.localStorage,(v:unknown)=>{
    const m=v as PlayerMeta;if(!m||!m.settings||!Array.isArray(m.achievements)||!Number.isSafeInteger(m.manual)||m.manual<0||!Number.isFinite(m.peak)||m.peak<0)throw new Error('Invalid player metadata');
    m.achievements=m.achievements.filter(id=>id!=='victory');
    if(m.achievements.some(id=>!ACHIEVEMENTS[id]))throw new Error('Invalid player metadata achievements');
    for(const k of ['autosave','floating','camera','collapseOnLevel','timer'])if(typeof m.settings[k]!=='boolean')throw new Error('Invalid setting');
    if(m.settings.uiSfx===undefined)m.settings.uiSfx=m.settings.sfx;
    for(const k of ['master','sfx','music','uiSfx'])if(!Number.isFinite(m.settings[k])||m.settings[k]<0||m.settings[k]>1)throw new Error('Invalid audio setting');m.tutorials=Array.isArray(m.tutorials)?m.tutorials.filter(i=>Number.isInteger(i)&&i>=0&&i<8):[];m.synced=Array.isArray(m.synced)?m.synced.filter(id=>!!ACHIEVEMENTS[id]):[];return m;
},'ftq.player.v1');
export const playerMeta:PlayerMeta=repository.load()||JSON.parse(JSON.stringify(defaults));
export const preferences=playerMeta.settings;
export function savePlayerMeta():void {repository.save(playerMeta);}
export function unlockAchievement(id:string):boolean {if(!ACHIEVEMENTS[id]||playerMeta.achievements.includes(id))return false;playerMeta.achievements.push(id);savePlayerMeta();return true;}
