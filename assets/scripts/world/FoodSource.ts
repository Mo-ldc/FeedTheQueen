import { Node, Vec3 } from 'cc';
import { Food } from '../core/FeedingModel';
/** Shared reservation protocol for bushes and building stores. */
export interface FoodSource {
    node:Node;remaining:number;reserved:number;generation:number;foodType:Food;
    reserveForHauler(maximum:number):number;
    collectReservedForHauler(amount:number):number;
    releaseReservation(amount:number):void;
    harvestPosition?():Vec3;
    beginHarvest?():void;
    finishHarvest?():void;
}
/** A relay accepts physical deliveries without crediting nutrition on the first leg. */
export interface FoodRelay {
    node:Node;
    claimRelay():boolean;
    deliveryPosition():Vec3;
    receiveRelay(food:Food):void;
}
/** Input stores reserve capacity only for food already in flight. */
export interface FoodReceiver {
    node:Node;
    generation?:number;
    accepts(food:Food):boolean;
    reserveInput(food:Food):boolean;
    receiveInput(food:Food):boolean;
    deliveryPosition():Vec3;
}
