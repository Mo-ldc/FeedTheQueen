import { originalText } from './OriginalText';
import { tooltipIcon, buffEffectDescription } from './HudTooltipConfig';
import type { FeedingModel } from '../core/FeedingModel';
/** Equations and effect paragraphs from FeedManager.get_description, with live upgrade values. */
export function foodDetails(id:number,base:number,model:FeedingModel|null,goldenApples=false):string {
    const o=model?.options,genes=o?.specialisations||{};
    const value=(food:number)=>model?.baseValue(food)??base;
    const source=(food:number)=>tooltipIcon('source'+food),food=tooltipIcon('food');
    let equation=source(id)+' = '+value(id)+' '+food;
    const relative:Record<number,[number,number]>={2:[10,1],15:[3,1],16:[3,2],17:[10,10]};
    if(relative[id]){const [factor,other]=relative[id];equation=source(id)+' = '+factor+' x '+source(other)+' = '+value(id)+' '+food;}
    if(id===1&&goldenApples)equation+='<br/>'+source(2)+' = 10 x '+source(1)+' = '+value(2)+' '+food;
    if(id===15)equation+='<br/>'+source(16)+' = 3 x '+source(2)+' = '+value(16)+' '+food;
    const effects:Record<number,[string,number]>={4:['cold',2],5:['heat',3+(o?.heatAffinity||0)],6:['sour',1],9:['heat',2+(o?.heatAffinity||0)],13:['shine',1],14:['umami',2+(genes.secret?0:o?.handlers||0)],18:['frostburn',6+(o?.heatAffinity||0)],19:['heat',8+(o?.heatAffinity||0)*6]};
    const effect=effects[id];if(!effect)return equation;
    const [key,stacks]=effect;
    if(id===13||(id===14&&!genes.secret))equation=source(id)+' = '+stacks+' '+tooltipIcon(key);
    else equation+=' '+stacks+' '+tooltipIcon(key);
    return equation+'<br/><br/>'+buffEffectDescription(key,{coldStrength:model?.coldStrength??.5,harmony:!!genes.harmony,acid:!!genes.acid,sourAddend:!!genes.sour_addend});
}
