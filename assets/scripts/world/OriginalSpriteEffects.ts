import { Rect, Vec2, SpriteFrame, Sprite, Material, EffectAsset, isValid, Vec4, Texture2D } from 'cc';
import { gameResources as resources } from '../managers/GameBundles';
let effect:Promise<EffectAsset>|null=null;
let noise:Promise<Texture2D>|null=null;
function oceanNoise():Promise<Texture2D>{return noise??=new Promise((resolve,reject)=>resources.load('effects/ocean-noise/texture',Texture2D,(e,t)=>{if(e){reject(e);return;}t.addRef();t.setWrapMode(Texture2D.WrapMode.REPEAT,Texture2D.WrapMode.REPEAT);t.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);resolve(t);}));}
const fullFrames=new Map<SpriteFrame,SpriteFrame>();
const materials=new WeakMap<Sprite,Material>();
const desired=new WeakMap<Sprite,{params:number[];time:number}>();
/** Godot gemini/erase_sprite equations, with a private material per animated sprite. */
export function spriteEffect(sprite:Sprite,mode:number,a=0,b=1,c=1,time=0):void {
    if(!isValid(sprite,true))return;
    const params=[mode,a,b,c];desired.set(sprite,{params,time});
    if(sprite.spriteFrame){const original=sprite.spriteFrame;if(!fullFrames.has(original)){const source=(original as SpriteFrame&{original?:{_texture:SpriteFrame['texture']}}).original?._texture||original.texture;source.addRef();const full=new SpriteFrame();full.texture=source;full.originalSize=original.originalSize;full.packable=false;full.rect=new Rect(0,0,original.originalSize.width,original.originalSize.height);full.offset=new Vec2();fullFrames.set(original,full);fullFrames.set(full,full);}sprite.spriteFrame=fullFrames.get(original)!;sprite.trim=false;}
    const material=materials.get(sprite);if(material){material.setProperty('effectParams',new Vec4(...params));material.setProperty('effectTime',new Vec4(time,0,0,0));return;}
    effect??=new Promise((resolve,reject)=>resources.load('effects/original-sprite',EffectAsset,(e,a)=>e?reject(e):resolve(a)));
    if(sprite.customMaterial)return;
    effect.then(async asset=>{const texture=await oceanNoise();if(!isValid(sprite,true)||materials.has(sprite))return;const m=new Material();m.initialize({effectAsset:asset,defines:{USE_TEXTURE:true}});materials.set(sprite,m);sprite.customMaterial=m;m.setProperty('noiseTexture',texture);const d=desired.get(sprite)!;m.setProperty('effectParams',new Vec4(...d.params));m.setProperty('effectTime',new Vec4(d.time,0,0,0));sprite.node.once('node-destroyed',()=>m.destroy());}).catch(console.error);
}
export function clearSpriteEffect(sprite:Sprite):void {const m=materials.get(sprite);if(m){sprite.customMaterial=null;m.destroy();materials.delete(sprite);}desired.delete(sprite);}
