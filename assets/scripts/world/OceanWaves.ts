import { _decorator, Component, Node, Sprite, UITransform, isValid } from 'cc';
import { originalFrame } from './OriginalArt';
import { spriteEffect } from './OriginalSpriteEffects';
import { WorldLayers } from './WorldLayers';
const {ccclass}=_decorator;
/** Original Waves layer and shader uniforms; the baked NoiseTexture2D uses the original FastNoiseLite defaults. */
@ccclass('OceanWaves')
export class OceanWaves extends Component {
 private waves:Node|null=null;private time=0;private effectElapsed=0;
 start():void {originalFrame('original/Environment/Waves').then(frame=>{if(!isValid(this,true))return;const n=this.waves=new Node('OceanWaves');n.layer=this.node.layer;this.node.addChild(n);const layers=this.getComponent(WorldLayers)||this.node.getComponent(WorldLayers);if(layers){layers.ensureLayers();}else{n.setSiblingIndex(1);}n.addComponent(UITransform).setContentSize(7078,4052);const sprite=n.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=frame;n.getComponent(UITransform)!.setContentSize(7078,4052);spriteEffect(sprite,4,.1,5,3,0);}).catch(console.error);}
 update(dt:number):void {this.time+=dt;if(!this.waves)return;this.effectElapsed+=dt;if(this.effectElapsed<1/15)return;this.effectElapsed%=1/15;spriteEffect(this.waves.getComponent(Sprite)!,4,.1,5,3,this.time);}
 onDestroy():void {if(this.waves&&isValid(this.waves,true))this.waves.destroy();}
}
