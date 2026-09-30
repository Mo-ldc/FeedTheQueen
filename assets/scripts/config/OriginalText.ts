import { ORIGINAL_MESSAGES } from './OriginalMessages';

const COLORS:Record<string,string>={unit:'#8453de',bush:'#66a835',tree:'#66a835',aphid:'#85c849',aphid_1:'#e59a34',aphid_2:'#c12d00',aphid_3:'#ea85fd',trap:'#5f6162',bug:'#ea85fd',shroom:'#6c4838',spores:'#9471bf',sweet:'#d49a27',gold:'#edaf3b',hot:'#e84d00',cold:'#25cee4',frostburn:'#b467cb',sour:'#5f7f1e',umami:'#b46f3c',shiny:'#398ca4',bonus:'#ff594d',mult:'#1c84ff'};
const TERMS:Record<string,string>={NAME_FOOD:'#25bd49',NAME_LARVAE:'#8453de',NAME_DNA:'#3e74e3',NAME_BRAIN_MATTER:'#ff9898',NAME_FEEDING_RATE:'#25bd49',NAME_MULTIPLIER:'#1c84ff',NAME_BONUS:'#ff594d',NAME_STATUS_HEAT:COLORS.hot,NAME_STATUS_COLD:COLORS.cold,NAME_STATUS_FROSTBURN:COLORS.frostburn,NAME_STATUS_SOUR:COLORS.sour,NAME_STATUS_UMAMI:COLORS.umami,NAME_STATUS_ECSTASY:COLORS.gold,NAME_STATUS_SHINE:COLORS.shiny};
const FOOD_COLORS:Record<string,string>={APPLE_RED:'#dd1533',APPLE_GOLD:'#edaf3b',BLUEBERRY:'#2b66c5',ICEBERRY:'#25cee4',SPICY:'#e84d00',SOUR:'#5f7f1e',HONEYDEW:'#e59a34',HOTSAUCE:'#c12d00',BUGMEAT:'#ea85fd',SARDINE:'#5281eb',TAKO:'#e05a3c',PEARL:'#398ca4',CHANTERELLE:'#c29227'};
/** Resolve original placeholders and markup without paraphrasing or dropping text. */
export function originalText(key:string,values:Record<string,string|number>={},rich=true):string {
    // The shipped Chinese UMAMI message misses the opening brace on SARDINE.
    let text=(ORIGINAL_MESSAGES[key]??key).replace(/(^|[^\{])\b(NAME_[A-Z_]+)\}/g,'$1{$2}');
    for(let i=0;i<6;i++){
        const next=text.replace(/\{([^}]+)\}/g,(all,term:string)=>{
            if(values[term]!==undefined)return String(values[term]);
            if(ORIGINAL_MESSAGES[term]===undefined)return all;
            const color=TERMS[term]||(term.startsWith('BUILDING_NAME_')?'#8453de':term.startsWith('NAME_FOOD_')?FOOD_COLORS[term.slice(10)]||'#b46f3c':undefined);
            return rich&&color?`<color=${color}><b>${ORIGINAL_MESSAGES[term]}</b></color>`:ORIGINAL_MESSAGES[term];
        });if(next===text)break;text=next;
    }
    text=text.replace(/\[([a-z_0-9]+)\]/g,(all,tag:string)=>COLORS[tag]?rich?`<color=${COLORS[tag]}><b>`:'':tag==='b'?rich?'<b>':'':all)
        .replace(/\[\/([a-z_0-9]+)\]/g,(all,tag:string)=>COLORS[tag]?rich?'</b></color>':'':tag==='b'?rich?'</b>':'':all);
    return rich?text.replace(/\n/g,'<br/>'):text.replace(/<[^>]+>/g,'');
}
