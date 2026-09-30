/** Port of feed_manager.gd. Timers and source IDs deliberately match the original. */
export enum Food {
    Apple=1, GoldenApple, Blueberry, Iceberry, Pepper, Citrus, Wirly, Honeydew,
    Sauce, Meat, Sardine, Tako, Pearl, Chanterelle, CandyApple, GoldenCandyApple,
    Skewer, Flambe, Scarlet, Focus, Euphoria, Verdant, Clear,
    Heat, Cold, Frostburn, Sour, Umami, Ecstasy, Shine,
}
export interface FeedingOptions {
    appleBonus:number; meatValue:number; heatAffinity:number; coldAffinity:number;
    coldFactor:number; handlers:number; extraHandlers:number; queenLevel:number; dnaLevel:number;
    undergroundBonus:number; verdantFactor:number; clearFactor:number; sororityBonus:number;
    cordonBleu:boolean; uncapEcstasy:boolean; specialisations:Record<string,boolean>;
}
export interface FeedingSnapshot {
    elapsed:number; heat:number; coldPre:number; cold:number; frostburn:number; sour:number;
    umami:number; ecstasy:number; shine:number; heatBonus:number; coldBonus:number;
    frostburnBonus:number; sourBonus:number; sourAddend:number; ecstasyBonus:number; shineBonus:number;
}
const initial=():FeedingSnapshot=>({elapsed:0,heat:0,coldPre:0,cold:0,frostburn:0,sour:0,umami:0,
    ecstasy:0,shine:0,heatBonus:0,coldBonus:0,frostburnBonus:0,sourBonus:0,sourAddend:0,ecstasyBonus:0,shineBonus:0});
export class FeedingModel {
    public state=initial();
    /** Rewarded feast doubles the next N ingested foods' base values. */
    public feastCharges=0;
    public options:FeedingOptions={appleBonus:0,meatValue:50,heatAffinity:0,coldAffinity:0,coldFactor:1,
        handlers:0,extraHandlers:0,queenLevel:0,dnaLevel:0,undergroundBonus:0,verdantFactor:1,
        clearFactor:1,sororityBonus:0,cordonBleu:false,uncapEcstasy:false,specialisations:{}};
    private diet:number[]=[];
    public setDiet(contributions:Record<number,number>):void {
        this.diet=Object.keys(contributions).map(Number).filter(id=>id<=19&&contributions[id]>0);
    }
    private has(name:string):boolean{return !!this.options.specialisations[name];}
    public get coldStrength():number {
        const o=this.options;
        return (.5+o.coldAffinity+(this.has('brain_freeze')?o.queenLevel*.3+(o.dnaLevel>=8?.3:0):0))*o.coldFactor;
    }
    public get addend():number {
        const sweet=this.has('sweet_tooth')?this.diet.filter(id=>[1,2,3,4,6,8,15,16,18].includes(id)).length*8:0;
        return Math.trunc((this.state.heatBonus+this.state.sourAddend+sweet)*this.options.verdantFactor);
    }
    public get multiplier():number {
        const s=this.state;
        return (1+s.coldBonus+s.frostburnBonus+s.sourBonus+s.ecstasyBonus+s.shineBonus+this.options.sororityBonus
            +(this.has('balanced_diet')?this.diet.length*.2:0)
            +(this.has('one_track_mind')&&this.diet.length<=3?3:0)
            +(this.has('gourmet')&&this.diet.filter(id=>id>=15&&id<=19).length>=2?6:0))*this.options.clearFactor;
    }
    public baseValue(food:Food):number {
        const o=this.options;
        let base=({1:20+o.appleBonus,2:(20+o.appleBonus)*10,3:1,4:5,5:10,6:3,7:1,8:5,9:1,
            10:o.meatValue,11:125,12:1000,13:0,14:this.has('secret')?200*o.handlers:0,
            15:(20+o.appleBonus)*3,16:(20+o.appleBonus)*30,17:o.meatValue*10,18:50,19:20} as Record<number,number>)[food];
        if(base===undefined)throw new Error('Food has no ingestion rule: '+food);
        if(this.has('underground'))base+=Math.round(base*o.undergroundBonus);
        if(food>=15&&food<=19&&o.cordonBleu)base*=5;
        return base;
    }
    public eat(food:Food):{base:number;nutrition:number;contributions:Record<number,number>} {
        let base=this.baseValue(food);const s=this.state,o=this.options;
        if(this.feastCharges>0){base*=2;this.feastCharges--;}
        const heat=(amount:number)=>{if(s.frostburn<=100)s.heat+=amount;};
        if(food===Food.Pepper)heat(3+o.heatAffinity);
        if(food===Food.Sauce)heat(2+o.heatAffinity);
        if(food===Food.Scarlet)heat(8+o.heatAffinity*6);
        if(food===Food.Iceberry&&!(s.heat>10&&!this.has('harmony'))&&s.frostburn<=100){
            if(s.cold>0)s.cold=Math.min(100,s.cold+2);
            else {s.coldPre+=2;if(s.coldPre>50){s.cold=Math.min(100,s.coldPre);s.coldPre=0;}}
        }
        if(food===Food.Flambe){s.frostburn+=6+o.heatAffinity;s.heat=0;s.cold=0;}
        if(food===Food.Citrus)s.sour++;
        if((food===Food.GoldenApple||food===Food.GoldenCandyApple)&&this.has('ecstasy'))s.ecstasy++;
        if(food===Food.Pearl)s.shine++;
        if(food===Food.Chanterelle)s.umami=Math.min(200+(o.handlers+o.extraHandlers)*20,s.umami+2+(this.has('secret')?0:o.handlers));
        const contributions:Record<number,number>={};
        if(s.heat>0&&s.heatBonus>0)contributions[Food.Heat]=s.heatBonus;
        if(s.sourAddend>0)contributions[Food.Sour]=s.sourAddend;
        const withAddend=base+this.addend;
        if(s.cold>0&&s.coldBonus>0)contributions[Food.Cold]=withAddend*s.coldBonus;
        if(s.frostburn>100&&s.frostburnBonus>0)contributions[Food.Frostburn]=withAddend*s.frostburnBonus;
        if(s.sourBonus>0)contributions[Food.Sour]=(contributions[Food.Sour]||0)+withAddend*s.sourBonus;
        if(s.ecstasyBonus>0)contributions[Food.Ecstasy]=withAddend*s.ecstasyBonus;
        if(s.shineBonus>0)contributions[Food.Shine]=withAddend*s.shineBonus;
        let nutrition=withAddend*this.multiplier;
        if(s.umami>0&&([10,11,12,17].includes(food)||(food===14&&this.has('secret')))){
            contributions[Food.Umami]=nutrition*3;nutrition*=4;s.umami--;
        }
        return {base,nutrition,contributions};
    }
    public advance(dt:number):void {
        if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid feeding clock');
        const s=this.state, previous=Math.floor(s.elapsed),end=s.elapsed+dt;
        for(let second=previous+1;second<=Math.floor(end);second++){
            if(second%5===0){
                if(s.heat>=10){s.heatBonus=Math.floor(s.heat*.1);s.heat*=.5;}else s.heatBonus=0;
                if(s.cold>=50){s.coldBonus=this.coldStrength;s.cold-=50;}else s.coldBonus=0;
                if(s.frostburn>100){s.frostburnBonus=this.coldStrength*2+s.frostburn*.01;s.frostburn*=.5;}else s.frostburnBonus=0;
            }
            if(second%10===0){
                const sour=Math.min(s.sour,this.has('acid')?600:150);
                s.sourAddend=this.has('sour_addend')?Math.trunc(sour*2):0;
                s.sourBonus=this.has('sour_addend')?0:sour*.03;s.sour=0;
            }
            if(second%60===0){
                if(this.has('ecstasy')){s.ecstasyBonus=this.options.uncapEcstasy?s.ecstasy*.25:Math.min(15,s.ecstasy*.25);s.ecstasy=0;}
                s.shineBonus=s.shine*.1;s.shine=0;
            }
        }
        s.elapsed=end;
    }
    public restore(value:unknown):void {
        const defaults=initial(), input=value as FeedingSnapshot;
        if(!input||Object.keys(defaults).some(k=>!Number.isFinite(input[k])||input[k]<0))throw new Error('Invalid taste snapshot');
        if(input.cold>100||input.coldPre>50||!Number.isInteger(input.cold)||!Number.isInteger(input.umami))throw new Error('Invalid taste stacks');
        this.state={...defaults,...input};
    }
}
