import { _decorator, Component, AudioSource, AudioClip, Canvas, Node, input, Input, isValid } from 'cc';
import { loadMusicClip } from '../managers/GameBundles';
import { preferences } from './PlayerMeta';
import { unlockOriginalAudio } from './OriginalSound';
import { BlueberryFeeding } from '../world/BlueberryFeeding';

const {ccclass}=_decorator;
const LISTS=[[1,2,3,4,5,6,7],[8,9,10,11,12,13],[14,15,16]];

@ccclass('ColonyAudio')
export class ColonyAudio extends Component {
    private sources:AudioSource[]=[];
    private active=0;
    private unlocked=false;
    private loading=false;
    private playlist=-1;
    private bag:number[]=[];
    private fade=3;
    private retryAfter=0;
    private gestureRoots:Node[]=[];

    start():void {
        for(let i=0;i<2;i++){
            const source=this.addComponent(AudioSource);source.playOnAwake=false;source.loop=false;this.sources.push(source);
        }
        input.on(Input.EventType.TOUCH_START,this.unlock,this);
        input.on(Input.EventType.MOUSE_DOWN,this.unlock,this);
        // UI hits swallow pointer events before the global input dispatcher.
        // Capture on each Canvas so editor Game View and mini-games unlock too.
        this.gestureRoots=this.node.scene.getComponentsInChildren(Canvas).map(canvas=>canvas.node);
        for(const root of this.gestureRoots){
            root.on(Node.EventType.TOUCH_START,this.unlock,this,true);
            root.on(Node.EventType.MOUSE_DOWN,this.unlock,this,true);
        }
        if(typeof window!=='undefined'){
            window.addEventListener('pointerdown',this.gesture,{passive:true});
            window.addEventListener('keydown',this.gesture);
        }
    }

    private gesture=()=>this.unlock();

    private unlock():void {
        this.unlocked=true;unlockOriginalAudio();
        const source=this.sources[this.active];
        if(source?.clip){if(!source.playing)source.play();}
        else if(!this.loading && Date.now() >= this.retryAfter)this.next();
    }

    private next():void {
        const level=this.getComponent(BlueberryFeeding)?.queenLevel||0;
        const group=level<=3?0:level<=5?1:level<=7?2:0;
        if(group!==this.playlist||!this.bag.length){
            this.playlist=group;this.bag=[...LISTS[group]];
            for(let i=this.bag.length-1;i>0;i--){
                const j=Math.floor(Math.random()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];
            }
        }
        this.load('queen_loop_'+this.bag.pop());
    }

    private load(path:string):void {
        this.loading=true;
        void loadMusicClip(path,AudioClip).then(clip=>{
            if(!isValid(this,true))return;
            this.loading=false;
            this.active=1-this.active;
            const source=this.sources[this.active];source.stop();source.clip=clip;source.volume=0;this.fade=0;
            if(this.unlocked)source.play();
        }).catch(error=>{
            if(!isValid(this,true))return;
            this.loading=false;
            // Music is optional: an unavailable remote bundle never blocks gameplay
            // or retries on every frame. A later retry can recover from lost network.
            this.retryAfter=Date.now()+30000;
            console.warn('Music unavailable; retrying later',error);
        });
    }

    update(dt=0):void {
        if(!this.sources.length)return;
        this.fade=Math.min(3,this.fade+dt);
        const source=this.sources[this.active],old=this.sources[1-this.active];
        source.volume=preferences.master*preferences.music;
        old.volume=preferences.master*preferences.music*(1-this.fade/3);
        if(this.fade>=3&&old.playing)old.stop();
        const level=this.getComponent(BlueberryFeeding)?.queenLevel||0;
        const group=level<=3?0:level<=5?1:level<=7?2:0;
        if(this.unlocked&&!this.loading&&Date.now()>=this.retryAfter&&(group!==this.playlist||!source.clip||(!source.playing&&this.fade>=3)))this.next();
    }

    onDestroy():void {
        if(typeof window!=='undefined'){
            window.removeEventListener('pointerdown',this.gesture);
            window.removeEventListener('keydown',this.gesture);
        }
        input.off(Input.EventType.TOUCH_START,this.unlock,this);
        input.off(Input.EventType.MOUSE_DOWN,this.unlock,this);
        for(const root of this.gestureRoots)if(isValid(root,true)){
            root.off(Node.EventType.TOUCH_START,this.unlock,this,true);
            root.off(Node.EventType.MOUSE_DOWN,this.unlock,this,true);
        }
        this.gestureRoots=[];
        for(const source of this.sources)if(isValid(source,true))source.stop();
    }
}
