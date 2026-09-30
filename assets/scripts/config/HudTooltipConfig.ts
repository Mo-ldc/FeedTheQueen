import { originalText } from './OriginalText';
/** zh_Hans.translation: DESCRIPTION_FEEDING_RATE / DESCRIPTION_LVL_UP / DESCRIPTION_DNA_UP.
 *  Placeholder styling follows Global.__ON7P in the original game. */
// Cocos centers images on its line box; the Chinese glyphs sit higher inside it.
// Compensate by six logical pixels so the visible icon and glyph centers match.
export function tooltipIcon(name: string): string {
    return `<img src="${name}" width="20" height="20" align="center" offset="0,6" />`;
}
const food = '<color=#25bd49><b>食物</b></color>'+tooltipIcon('food');
const dna = '<color=#3e74e3><b>基因点数</b></color>'+tooltipIcon('dna');

export function feedingRateDescription(): string {
    return originalText('DESCRIPTION_FEEDING_RATE');
}

export function queenMilestoneDescription(nextRate: string): string {
    return originalText('DESCRIPTION_LVL_UP',{value:nextRate});
}

export function dnaMilestoneDescription(nextRate: string): string {
    return originalText('DESCRIPTION_DNA_UP',{value:nextRate});
}

export interface BuffTooltipState {
    active:boolean;stacks:number;value:number;contribution:number;coldStrength:number;
    harmony:boolean;acid:boolean;sourAddend:boolean;
}
/** Original contribution/state, effect and incompatibility sections. */
export function buffDescription(key:string,state:BuffTooltipState,format:(n:number)=>string):string {
    const suffix=key.toUpperCase(),name=originalText('{NAME_STATUS_'+suffix+'}');
    let text=originalText('DESCRIPTION_GENERAL_CONTRIBUTION',{source:name,value:format(state.contribution)})+tooltipIcon('food');
    if(key!=='umami')text+='<br/>'+originalText(state.active?'BUFF_CURRENT_ACTIVE':'BUFF_CURRENT_INACTIVE',{name});
    if(state.active&&state.value>0)text+='<br/>'+originalText('CURRENT_VALUE',{value:String(Math.round(state.value*100)/100)});
    text+='<br/>'+originalText('CURRENT_STACKS',{stacks:Math.floor(state.stacks)});
    return text+'<br/><br/>'+buffEffectDescription(key,state);
}
export function buffEffectDescription(key:string,state:Pick<BuffTooltipState,'coldStrength'|'harmony'|'acid'|'sourAddend'>):string {
    const suffix=key.toUpperCase(),name=originalText('{NAME_STATUS_'+suffix+'}');
    let effect=originalText('EXPLANATION_'+suffix,{value:String(Math.round(state.coldStrength*(key==='frostburn'?2:1)*100)/100)});
    if(key==='sour')effect=effect.replace('[value1]',state.sourAddend?'200':'3').replace('[BUFF_NAME]',originalText(state.sourAddend?'NAME_BONUS':'NAME_MULTIPLIER')).replace('[value2]',state.sourAddend?state.acid?'1200':'300':state.acid?'18':'4.5').replace('[value3]',state.acid?'600':'150');
    let text=name+': '+effect;
    if((key==='heat'||key==='cold')&&!state.harmony)text+='<br/><br/>'+originalText('EXPLANATION_DISHARMONY');
    if(key==='frostburn')text+='<br/><br/>'+originalText('EXPLANATION_DISHARMONY_FROSTBURN');
    return text;
}
