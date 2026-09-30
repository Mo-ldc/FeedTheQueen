import { _decorator, Component } from 'cc';
const {ccclass,property}=_decorator;
/** Explicit drawing band before ground Y sorting, corresponding to Godot z_index. */
@ccclass('WorldDepth')
export class WorldDepth extends Component {
    @property public band=0;
}
