export function fishingPlan(mode:number,bait:number,lead:boolean,fishUpgrade:number,takoUpgrade:number,deepSea:boolean){
    const unit=([0,.4,.2,1][mode]||1)*(lead?2:1),maximum=Math.round(40/unit),used=Math.min(bait,maximum),fraction=used/maximum;
    return {used,duration:50-used*unit,food:mode===1?11:mode===2?12:13,
        amount:mode===1?800:mode===2?40+Math.floor(40*fraction*.25*takoUpgrade)*(deepSea?10:1):20,
        bonus:mode===1?Math.floor(800*fraction*.25*fishUpgrade)*(deepSea?10:1):0};
}
export const BOAT_ORIGINS=[[110,280],[-260,280],[-410,180],[-72,280],[270,210],[220,290],[10,330],[-180,330],[-360,300],[-440,250],[-50,410],[-180,410],[70,400],[-300,390],[170,390],[-430,360],[280,360],[-530,290],[360,280],[-550,210]];
export const MAX_FISHING_BOATS=BOAT_ORIGINS.length;
export const BOAT_ZONE=[[-1700,1420],[-1550,1580],[-1250,1660],[-760,1660],[-470,1390],[-190,1580],[-80,1840],[-368,1885],[-1564,1877],[-2423,1853],[-2963,1801],[-3129,1547],[-3090,1290],[-2653,1275],[-2104,1384]];
