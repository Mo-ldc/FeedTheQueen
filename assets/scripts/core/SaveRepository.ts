export interface SaveStorage {getItem(key:string):string|null;setItem(key:string,value:string):void;}
/** Two validated copies. A corrupt primary must never overwrite a healthy backup. */
export class SaveRepository<T> {
    constructor(private storage:SaveStorage,private validate:(value:unknown)=>T,private key='ftq.colony.v1'){}
    public load():T|null {
        const candidates:{time:number;value:T}[]=[];
        for(const key of [this.key,this.key+'.backup'])try{
            const raw=this.storage.getItem(key);if(!raw)continue;
            const record=JSON.parse(raw);
            if(record.version!==1||!Number.isFinite(record.time)||typeof record.payload!=='string'||record.hash!==this.hash(record.payload))continue;
            candidates.push({time:record.time,value:this.validate(JSON.parse(record.payload))});
        }catch{/* Try the other copy, including when storage is unavailable. */}
        return candidates.sort((a,b)=>b.time-a.time)[0]?.value||null;
    }
    public save(value:T):void {
        const payload=JSON.stringify(this.validate(value));
        const record=JSON.stringify({version:1,time:Date.now(),payload,hash:this.hash(payload)});
        // Each copy is self-contained. Failure leaves at least the previous primary intact.
        this.storage.setItem(this.key+'.backup',record);
        this.storage.setItem(this.key,record);
    }
    private hash(text:string):string {let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
}
