from pathlib import Path
import json,copy,uuid
ROOT=Path(__file__).resolve().parent.parent
def read(p):return json.loads(p.read_text(encoding='utf8'))
def save(p,a):p.write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

# Apply slice mode while keeping authored portrait dimensions and click targets.
slice_ids=set()
for p in (ROOT/'assets').rglob('*.png.meta'):
 m=read(p)
 for sub in m.get('subMetas',{}).values():
  if sub.get('importer')=='sprite-frame' and sub['userData'].get('borderTop',0):slice_ids.add(sub['uuid'])
for p in (ROOT/'assets').rglob('*'):
 if p.suffix not in ['.scene','.prefab']:continue
 a=read(p);changed=False
 for o in a:
  if o.get('__type__')=='cc.Sprite' and (o.get('_spriteFrame') or {}).get('__uuid__') in slice_ids:
   o['_type']=1;o['_sizeMode']=0;changed=True
 if changed:save(p,a)

p=ROOT/'assets/scenes/Main.scene';a=read(p)
canvas=next(i for i,n in enumerate(a) if n.get('__type__')=='cc.Node' and n['_name']=='Canvas')
button=next(i for i,n in enumerate(a) if n.get('__type__')=='cc.Node' and n['_name']=='Button')
node_template=copy.deepcopy(a[button])
ui_template=copy.deepcopy(next(o for o in a if o.get('__type__')=='cc.UITransform'))
sprite_template=copy.deepcopy(next(o for o in a if o.get('__type__')=='cc.Sprite'))
label_template=copy.deepcopy(next(o for o in a if o.get('__type__')=='cc.Label'))
def add_node(name,parent,x,y,w,h,component):
 existing=next((i for i,n in enumerate(a) if n.get('__type__')=='cc.Node' and n.get('_name')==name),None)
 if existing is not None:return
 idx=len(a);n=copy.deepcopy(node_template);n.update(_name=name,_parent={'__id__':parent},_children=[],_components=[{'__id__':idx+1},{'__id__':idx+2}],_prefab=None,_id=str(uuid.uuid4()))
 n['_lpos'].update(x=x,y=y);n['_lscale'].update(x=1,y=1)
 u=copy.deepcopy(ui_template);u.update(node={'__id__':idx},_prefab=None,_id=str(uuid.uuid4()));u['_contentSize'].update(width=w,height=h)
 c=copy.deepcopy(component);c.update(node={'__id__':idx},_prefab=None,_id=str(uuid.uuid4()))
 a.extend([n,u,c]);a[parent]['_children'].append({'__id__':idx})
logo=copy.deepcopy(sprite_template);logo.update(_spriteFrame={'__uuid__':read(ROOT/'assets/textures/main-menu/original-logo.png.meta')['uuid']+'@f9941','__expectedType__':'cc.SpriteFrame'},_sizeMode=0,_type=0)
logo['_color'].update(r=255,g=255,b=255,a=255)
add_node('OriginalTitleLogo',canvas,0,555,600,337.5,logo)
caption=copy.deepcopy(label_template);caption.update(_string='开始游戏',_fontSize=48,_lineHeight=56,_horizontalAlign=1,_verticalAlign=1,_overflow=2,_isSystemFontUsed=True,_fontFamily='Arial',_font=None,_isBold=True)
caption['_color'].update(r=255,g=244,b=220,a=255)
add_node('StartCaption',button,0,0,420,100,caption)
logo_index=next(i for i,n in enumerate(a) if n.get('__type__')=='cc.Node' and n.get('_name')=='OriginalTitleLogo')
a[canvas]['_children']=[c for c in a[canvas]['_children'] if c['__id__']!=logo_index]
a[canvas]['_children'].insert(2,{'__id__':logo_index})
save(p,a)

# Original ants are front-facing sprites, with three walk/carry poses.
p=ROOT/'assets/scripts/world/Hauler.ts';s=p.read_text(encoding='utf8')
s=s.replace('angle = this.facingAngle;', 'angle = 0; // Original front-facing art stays upright in portrait view.')
if 'Math.floor(phase * 3)' not in s:
 s=s.replace('if (frame) this.body.spriteFrame = frame;', "if (this.cargo > 0 && this.task !== 'throw') {\n            frame = [this.carryFrame1, this.carryFrame2, this.carryFrame3][Math.floor(phase * 3)] || frame;\n        }\n        if (frame) this.body.spriteFrame = frame;")
p.write_text(s,encoding='utf8')
print('Portrait UI and original character poses adapted.')
