export interface OriginalTrack {times:number[];values:(number|number[])[];interpolation:number;transitions:number[];}
export function originalSample(track:OriginalTrack,time:number,duration:number,loop=true):number[] {
    const times=track.times;
    let values=(track as any)._normalizedValues as number[][];
    if(!values){
        values=track.values.map(v=>Array.isArray(v)?v:[v]);
        (track as any)._normalizedValues=values;
    }
    if(times.length===1)return values[0];
    if(!times.length)return [];
    const t=loop?((time%duration)+duration)%duration:Math.max(times[0],Math.min(time,duration));
    let i=0;while(i<times.length-1&&t>=times[i+1])i++;
    const next=i+1<times.length?i+1:loop?0:i,end=next===0?duration:times[next];
    if(track.interpolation===0)return values[i];
    let p=end>times[i]?(t-times[i])/(end-times[i]):0;
    const ease=track.transitions[i]||1;
    if(ease>0&&ease<1)p=1-Math.pow(1-p,1/ease);
    else if(ease>=1)p=Math.pow(p,ease);
    else if(ease<0)p=p<.5?Math.pow(p*2,-ease)*.5:(1-Math.pow(1-(p-.5)*2,-ease))*.5+.5;
    const a=values[i],b=values[next],prev=values[i>0?i-1:loop?values.length-2:0],after=values[next+1<values.length?next+1:loop?1:next];
    return a.map((v,k)=>track.interpolation===2?.5*(2*v+(-prev[k]+b[k])*p+(2*prev[k]-5*v+4*b[k]-after[k])*p*p+(-prev[k]+3*v-3*b[k]+after[k])*p*p*p):v+(b[k]-v)*p);
}
