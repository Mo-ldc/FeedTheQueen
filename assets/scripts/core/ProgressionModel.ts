import { QUEEN_MILESTONES, DNA_MILESTONES } from '../config/UIConfig';

export class ProgressionModel {
    public queenLevel=0;
    public dnaLevel=0;
    public dna=0;

    public grantDnaPoint():boolean {
        if(this.dnaLevel>=DNA_MILESTONES.length)return false;
        this.dnaLevel++;this.dna++;return true;
    }

    /** Awards each available milestone once; reaching the last one never ends the run. */
    public tick(rate:number):{queen:boolean;dna:boolean} {
        const result={queen:false,dna:false};
        if(this.queenLevel<QUEEN_MILESTONES.length&&rate>=QUEEN_MILESTONES[this.queenLevel]){
            this.queenLevel++;result.queen=true;
        }
        if(this.dnaLevel<DNA_MILESTONES.length&&rate>=DNA_MILESTONES[this.dnaLevel]){
            this.dnaLevel++;this.dna++;result.dna=true;
        }
        return result;
    }

    public get status(){
        const capped=this.queenLevel>=QUEEN_MILESTONES.length;
        return {
            queenLevel:this.queenLevel,dna:this.dna,
            nextQueenRate:QUEEN_MILESTONES[this.queenLevel]||QUEEN_MILESTONES[QUEEN_MILESTONES.length-1],
            previousQueenRate:capped?0:QUEEN_MILESTONES[this.queenLevel-1]||0,
            nextDnaRate:DNA_MILESTONES[this.dnaLevel]||DNA_MILESTONES[DNA_MILESTONES.length-1],
            previousDnaRate:DNA_MILESTONES[this.dnaLevel-1]||0,
        };
    }

    public restore(input:unknown):void {
        // Ignore the legacy `infinite` flag in existing saves.
        const p=input as {queenLevel:number;dnaLevel:number;dna:number};
        if(!p||![p.queenLevel,p.dnaLevel,p.dna].every(n=>Number.isSafeInteger(n)&&n>=0)
            ||p.queenLevel>QUEEN_MILESTONES.length||p.dnaLevel>DNA_MILESTONES.length)throw new Error('Invalid progression');
        this.queenLevel=p.queenLevel;this.dnaLevel=p.dnaLevel;this.dna=p.dna;
    }
}
