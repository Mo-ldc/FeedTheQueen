import { GENES } from '../config/GeneConfig';
export interface GeneSnapshot {available:number;run:number;selected:string[];suggested?:string[];}
/** DNA earned in a run becomes spendable when beginning the next colony. */
export class GeneModel {
    public available=0;
    public run=1;
    public selected:string[]=[];
    /** Last colony's selections are preselected, but still need Apply in the new run. */
    public suggested:string[]=[];
    public get remaining(){return this.available-this.selected.length;}
    public get flags():Record<string,boolean>{
        const flags:Record<string,boolean>={};
        for(const id of this.selected)flags[id]=true;
        for(const [tier,ids] of [[1,['silver_spoon']],[4,['providence']],[8,['sorority','sacrifice']],[12,['fishmonger','laboratory','tunnellers']],[16,['mine']]] as [number,string[]][])
            if(this.available>=tier)ids.forEach(id=>flags[id]=true);
        return flags;
    }
    public apply(ids:string[]):boolean {
        const next=[...new Set(ids)].filter(id=>!this.selected.includes(id));
        if(next.length>this.remaining||next.some(id=>!GENES.some(g=>g.id===id&&g.tier<=this.available)))return false;
        this.selected.push(...next);this.suggested=this.suggested.filter(id=>!this.selected.includes(id));return true;
    }
    public nextColony(total:number):void {this.suggested=[...new Set([...this.selected,...this.suggested])];this.available=total;this.selected=[];this.run++;}
    public snapshot():GeneSnapshot{return {available:this.available,run:this.run,selected:[...this.selected],...(this.suggested.length?{suggested:[...this.suggested]}:{})};}
    public restore(v:GeneSnapshot):void {
        if(!v||!Number.isSafeInteger(v.available)||v.available<0||v.available>100||!Number.isSafeInteger(v.run)||v.run<1||!Array.isArray(v.selected)||new Set(v.selected).size!==v.selected.length||v.selected.length>v.available||v.selected.some(id=>!GENES.some(g=>g.id===id&&g.tier<=v.available)))throw new Error('Invalid genes');
        if(v.suggested&&(!Array.isArray(v.suggested)||new Set(v.suggested).size!==v.suggested.length||v.suggested.length+v.selected.length>v.available||v.suggested.some(id=>v.selected.includes(id)||!GENES.some(g=>g.id===id&&g.tier<=v.available))))throw new Error('Invalid suggested genes');
        this.available=v.available;this.run=v.run;this.selected=[...v.selected];
        this.suggested=[...(v.suggested||[])];
    }
}
