import { WORLD } from '../config/WorldConfig';
export function insidePolygon(x:number,y:number,polygon:ReadonlyArray<readonly number[]>):boolean {
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
        const [xi,yi]=polygon[i], [xj,yj]=polygon[j];
        if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
    }
    return inside;
}
export function flightPosition(start:{x:number;y:number},end:{x:number;y:number},t:number,height:number):{x:number;y:number}{
    const p=Math.max(0,Math.min(1,t));
    return {x:start.x+(end.x-start.x)*p,y:start.y+(end.y-start.y)*p+4*height*p*(1-p)};
}
export class FeedingWindow {
    private clock=0;
    private arrivals:number[]=[];
    advance(dt:number):void {this.clock+=dt;while(this.arrivals.length&&this.arrivals[0]<=this.clock-WORLD.feeding.windowSeconds)this.arrivals.shift();}
    eat():void {this.arrivals.push(this.clock);}
    get nutrientsPerMinute():number {return this.arrivals.length;}
}
