import { _decorator, Component, Node, Camera, RenderTexture, SpriteFrame, Sprite, UITransform, Material, EffectAsset, Color, Vec4, BlockInputEvents, isValid } from 'cc';
import { gameResources as resources } from '../managers/GameBundles';
const {ccclass}=_decorator;
/** A separate camera excludes the menu layer, so the running colony stays blurred behind it. */
@ccclass('MenuBackdrop')
export class MenuBackdrop extends Component {
 public static readonly layer=1<<19;
 private capture:Camera|null=null;private source:Camera|null=null;private texture:RenderTexture|null=null;private frame:SpriteFrame|null=null;private material:Material|null=null;
 start():void {
  const canvas=this.node.parent!.parent!;this.source=canvas.getComponentsInChildren(Camera).find(c=>!c.targetTexture)!;
  if(!this.source)return;
  this.node.addComponent(BlockInputEvents);this.node.addComponent(UITransform);const sprite=this.node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;
  const cameraNode=new Node('MenuCaptureCamera');canvas.addChild(cameraNode);this.capture=cameraNode.addComponent(Camera);this.capture.projection=this.source.projection;this.capture.near=this.source.near;this.capture.far=this.source.far;this.capture.priority=this.source.priority-1;this.capture.visibility=this.source.visibility&~MenuBackdrop.layer;this.capture.clearFlags=Camera.ClearFlag.SOLID_COLOR;this.capture.clearColor=new Color(18,20,16,255);
  this.texture=new RenderTexture();this.frame=new SpriteFrame();this.frame.packable=false;this.resize();this.capture.targetTexture=this.texture;this.frame.texture=this.texture;sprite.spriteFrame=this.frame;
  resources.load('effects/original-sprite',EffectAsset,(error,asset)=>{if(error){console.error(error);return;}if(!isValid(this.node,true))return;const m=this.material=new Material();m.initialize({effectAsset:asset,defines:{USE_TEXTURE:true,SAMPLE_FROM_RT:true}});sprite.customMaterial=m;this.resize();});
 }
 private resize():void {if(!this.texture)return;const size=this.node.parent!.parent!.getComponent(UITransform)!;this.node.getComponent(UITransform)!.setContentSize(size.width,size.height);const width=Math.max(1,Math.ceil(size.width/4)),height=Math.max(1,Math.ceil(size.height/4));if(this.texture.width!==width||this.texture.height!==height){this.texture.reset({width,height});if(this.frame)this.frame.texture=this.texture;}this.material?.setProperty('effectParams',new Vec4(5,1/width,1/height,0));}
 lateUpdate():void {if(!this.capture||!this.source)return;this.resize();this.capture.node.setWorldPosition(this.source.node.worldPosition);this.capture.node.setWorldRotation(this.source.node.worldRotation);this.capture.orthoHeight=this.source.orthoHeight;}
 onDestroy():void {if(this.capture&&isValid(this.capture.node,true)){this.capture.targetTexture=null;this.capture.node.destroy();}const sprite=this.node.getComponent(Sprite);if(sprite)sprite.spriteFrame=null;this.frame?.destroy();this.texture?.destroy();this.material?.destroy();}
}
