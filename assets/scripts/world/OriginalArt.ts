import { SpriteFrame } from 'cc';
import { gameResources as resources } from '../managers/GameBundles';
import { FOOD_ITEMS } from '../config/ItemConfig';
const frames=new Map<string,Promise<SpriteFrame>>();
export function originalFrame(path:string):Promise<SpriteFrame> {
    if(!frames.has(path))frames.set(path,new Promise((resolve,reject)=>resources.load(path+'/spriteFrame',SpriteFrame,(e,a)=>e?reject(e):resolve(a))));
    return frames.get(path)!;
}
export function foodFramePath(id:number):string {
    const entry=FOOD_ITEMS.find(f=>f.id===id);
    if(!entry)throw new Error('Unknown food: '+id);
    return 'original/'+entry.icon.replace('textures/art/','').replace('.png','');
}
