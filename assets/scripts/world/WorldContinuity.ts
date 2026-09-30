import { _decorator, Component, Node, Vec3, isValid } from 'cc';
import { colonySave } from '../core/ColonyPersistence';
import { BlueberryFeeding } from './BlueberryFeeding';
import { WorldSpawnQueue } from './WorldSpawnQueue';
const {ccclass}=_decorator;
const SCHEMAS:Record<string,Record<string,string[]>>={
 LarvaPopulation:{larvae:["heading","wanderInterval","remaining","animationTime","animationSpeed","outside"]},
 Orchard:{trees:["types","jump"]},
 HaulerPopulation:{workers:['task','cargo','cargoType','reserved','seekLeft','throwLeft','hotLeft','animationTime','speedVariation','offset','facingAngle']},
 AdvancedFacilities:{workers:['task','cargo','cargoType','reserved','seekLeft','throwLeft','hotLeft','animationTime','speedVariation','offset','facingAngle']},
 ForagerPopulation:{workers:['direction','wanderLeft','discoveryLeft','animationTime']},
 ThrowerDen:{workers:['task','cargo','food','stamina','sleepLeft','seekLeft','throwLeft','relayLeft','relayReady','speedVariation','animation','animationTime','offset','reserved']},
 AphidFarm:{aphids:['direction','turn','phase','paused','recover','petTime'],farmerMotion:['direction','turn','phase']},
 MushroomLab:{workers:['direction','turn','pick','nap','phase','heldKind','holdLeft']},
 HunterCamp:{workers:['big','phase','age','duration','start','target','dropAt','order','animation']}
};
export interface ContinuityRecord {scope:string;list:string;index:number;fields:Record<string,number|string|boolean|number[]>;pose:{path:string;p:number[];s:number[];a:number;active:boolean}[];source?:{name:string;x:number;y:number;food:number};relay?:string;trap?:number;}
export interface ContinuitySnapshot {actors:ContinuityRecord[];farm?:{jumping:boolean;jumpTime:number;jumpStart:number[];target:number;previous:number;backflip:boolean;startup:number};}
@ccclass('WorldContinuity')
export class WorldContinuity extends Component {
 private pending:ContinuityRecord[]=[];private waitAge=0;private farm:ContinuitySnapshot['farm'];
 onLoad():void {const saved=colonySave.load()?.continuity;this.pending=saved?.actors||[];this.farm=saved?.farm;}
 private nodeFor(owner:any,list:string,item:any,index:number):Node|null {return item.node|| (list==='farmerMotion'?owner.farmers[index]:null);}
 public snapshot():ContinuitySnapshot {
  const actors:ContinuityRecord[]=[...this.pending],pendingKeys=new Set(this.pending.map(r=>`${r.scope}/${r.list}/${r.index}`));
  const u=this.getComponent(BlueberryFeeding)!.upgrades!.upgradeState;const limits:Record<string,number>={HaulerPopulation:u.level("haulers_SpawnHauler"),AdvancedFacilities:u.level("gemini_SpawnGemini"),ForagerPopulation:u.level("foragers_SpawnForager"),ThrowerDen:u.level("throwers_SpawnThrower"),HunterCamp:u.level("hunters_SpawnHunter")+u.level("hunters_SpawnBGH"),MushroomLab:u.level("mushrooms_SpawnMycologist")};
  for(const [scope,lists]of Object.entries(SCHEMAS)){const owner:any=this.getComponent(scope);if(!owner)continue;for(const [list,keys]of Object.entries(lists))for(const [index,raw]of (owner[list]||[]).entries()){const item=raw instanceof Node?raw.getComponent("Larva"):raw;if(!item)continue;
   if(scope in limits&&index>=limits[scope])continue;
   if(pendingKeys.has(`${scope}/${list}/${index}`))continue;const n=this.nodeFor(owner,list,item,index);if(!n||!isValid(n,true))continue;const fields:ContinuityRecord['fields']={};for(const k of keys){const v=item[k];if(Array.isArray(v))fields[k]=[...v];else if(v instanceof Vec3)fields[k]=[v.x,v.y,v.z];else if(typeof v==='number')fields[k]=Number.isFinite(v)?v:'Infinity';else if(typeof v==='boolean'||typeof v==='string')fields[k]=v;}
   const pose:ContinuityRecord['pose']=[];const visit=(n:Node,path:string)=>{pose.push({path,p:[n.position.x,n.position.y,n.position.z],s:[n.scale.x,n.scale.y,n.scale.z],a:n.angle,active:n.active});n.children.forEach((c,i)=>visit(c,path?path+'/'+i:String(i)));};visit(n,'');
   const record:ContinuityRecord={scope,list,index,fields,pose};const target=item.target;if(target?.reserveForHauler)record.source={name:target.node.name,x:target.node.position.x,y:target.node.position.y,food:target.foodType};if(item.relay)record.relay=item.relay.node.name;if(item.trap)record.trap=owner.traps.indexOf(item.trap);actors.push(record);
  }}const owner:any=this.getComponent('AphidFarm');const farm=owner?.building?{jumping:owner.jumping,jumpTime:owner.jumpTime,jumpStart:[owner.jumpStart.x,owner.jumpStart.y,0],target:owner.aphids.indexOf(owner.target),previous:owner.aphids.indexOf(owner.previous),backflip:owner.backflip,startup:owner.startup}:this.farm;return {actors,farm};
 }
 public blocks(node:Node,scope?:string):boolean {return this.pending.some(r=>{if(scope)return r.scope===scope;const owner:any=this.getComponent(r.scope);let item=owner?.[r.list]?.[r.index];return item&&(item instanceof Node?item:this.nodeFor(owner,r.list,item,r.index))===node;});}
 lateUpdate(dt:number):void {this.waitAge+=dt;
  const feeding=this.getComponent(BlueberryFeeding)!;
  for(let i=this.pending.length-1;i>=0;i--){const r=this.pending[i],owner:any=this.getComponent(r.scope);let item=owner?.[r.list]?.[r.index];if(!item){if(this.waitAge>10&&!this.getComponent(WorldSpawnQueue)?.hasPending(owner))this.pending.splice(i,1);continue;}const actor=item instanceof Node?item.getComponent("Larva"):item;if(!actor)continue;item=actor;const node=this.nodeFor(owner,r.list,item,r.index);if(!node)continue;
   const source=r.source?feeding.findSource(r.source):null;if(r.source&&!source){if(this.waitAge<=10)continue;delete r.source;r.fields.task="idle";r.fields.reserved=0;}
   if(item.target?.releaseReservation&&item.reserved)item.target.releaseReservation(item.reserved);
   for(const k of SCHEMAS[r.scope]?.[r.list]||[]){const v=r.fields[k];if(v===undefined)continue;if(Array.isArray(v)){if(item[k] instanceof Vec3)item[k].set(...v);else item[k]=Array.isArray(item[k])?[...v]:new Vec3(...v);}else item[k]=v==='Infinity'?Infinity:v;}
   if(source){item.target=source;item.targetGeneration=source.generation;item.generation=source.generation;item.reserved=source.reserveForHauler(Number(r.fields.reserved)||0);}
   if(r.relay)item.relay=feeding.findRelay(r.relay);if(r.trap!==undefined)item.trap=owner.traps[r.trap]||null;
   if(r.scope==="Orchard")item.fruit.forEach((n:Node,i:number)=>feeding.setFoodSprite(n,item.types[i]));item.updateFruit?.();item.applyAnimation?.();item.pose?.();
   for(const p of r.pose){let n:Node|undefined=node;for(const part of p.path?p.path.split('/'):[])n=n?.children[+part];if(!n)continue;n.setPosition(p.p[0],p.p[1],p.p[2]);n.setScale(p.s[0],p.s[1],p.s[2]);n.angle=p.a;n.active=p.active;}
   item.restorePresentation?.();
   this.pending.splice(i,1);
  }
  if(this.farm&&!this.pending.some(r=>r.scope==='AphidFarm')){const owner:any=this.getComponent('AphidFarm');if(owner?.aphids?.length){Object.assign(owner,{jumping:this.farm.jumping,jumpTime:this.farm.jumpTime,backflip:this.farm.backflip,startup:this.farm.startup});owner.jumpStart.set(...this.farm.jumpStart);owner.target=owner.aphids[this.farm.target]||null;owner.previous=owner.aphids[this.farm.previous]||null;this.farm=undefined;}}
 }
}
