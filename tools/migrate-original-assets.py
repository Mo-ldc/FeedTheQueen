"""One-time, backed-up migration to the exported original artwork. Run from project root."""
from pathlib import Path
from PIL import Image, ImageOps
import json, re, shutil, uuid, copy, hashlib, subprocess

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(r'E:\LDC_Cocos_PJ\Cocos3X_2D\喂蚁后\Exe\FEED THE QUEEN\蚂蚁Exported_Assets')
ART = SRC / '01_美术图像_Visuals'
REPORT = ROOT / 'reports/original-migration.json'
def read(p): return json.loads(p.read_text(encoding='utf-8'))
def write(p, data): p.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def relative(p): return p.relative_to(ROOT).as_posix()
def safe(p):
    p=p.resolve()
    if not p.is_relative_to((ROOT/'assets').resolve()): raise ValueError(f'Outside assets: {p}')
    return p

if REPORT.exists(): raise SystemExit('Migration already applied. Restore the backup before rerunning.')
git=Path(r'C:\Users\A\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe')
backup=subprocess.check_output([str(git),'rev-parse','HEAD'],cwd=ROOT,text=True).strip()
dirty=subprocess.check_output([str(git),'status','--porcelain','--','assets','settings'],cwd=ROOT,text=True)
if dirty.strip(): raise SystemExit('Commit assets and settings to Git before running the migration.')

audit=read(ROOT/'reports/asset-audit.json')['records']
template=read(ROOT/'assets/gameplay/original/circle.png.meta')
mapping={}; removed=[]; changed=[]; redirects={}; sliced=set(); protected=[]
def map_art(dest, src, slice_image=False):
    p=ROOT/dest; s=ART/src
    if not s.exists(): raise FileNotFoundError(s)
    mapping[p]=s
    if slice_image: sliced.add(p)

# Exact relative paths avoid accidentally matching icons with identical basenames.
for a in audit:
    p=ROOT/a['path']; r=a['path']
    if r.startswith('assets/gameplay/original/') and p.suffix=='.png':
        sub=r.removeprefix('assets/gameplay/original/').replace('GenePanel/','icons/')
        s=ART/sub
        if s.exists(): mapping[p]=s
    elif r.startswith('assets/gameplay/Queen/'):
        mapping[p]=ART/p.name
    elif p.suffix in ['.wav','.mp3','.ttf'] and a['source']:
        mapping[p]=Path(a['source'])

# Use original upgrade artwork at one canonical bundle path.
config=(ROOT/'assets/scripts/config/UpgradeConfig.ts').read_text(encoding='utf-8')
pairs=re.findall(r'"id": "([^"]+)".*?"icon": "([^"]+)"',config,re.S)
upgrade_paths={}
for item,icon in pairs:
    target=ROOT/('assets/gameplay/original/'+icon+'.png')
    mapping[target]=ART/(icon+'.png')
    upgrade_paths[item]='original/'+icon
    old=ROOT/('assets/gameplay/upgrade-skin/replacement-icons/'+item+'.png')
    if old.exists(): redirects[old]=target

ui={
 'assets/textures/main-menu/ksyx.png':('UI/BigButton1.png',True),
 'assets/textures/main-menu/settings-button.png':('cog.png',False),
 'assets/textures/loading-skin/Queen.png':('queen_lvl_0.png',False),
 'assets/textures/loading-skin/jdt1.png':('UI/Bar2.png',True),
 'assets/textures/loading-skin/jdt2.png':('UI/Bar1.png',True),
 'assets/textures/Game/add.png':('UI/ZoomIn.png',False),
 'assets/textures/Game/sub.png':('UI/ZoomOut.png',False),
 'assets/textures/Upgrade/Button.png':('UI/Button1.png',True),
 'assets/textures/Upgrade/Panel.png':('UI/Box.png',True),
 'assets/textures/Upgrade/RateSolid.png':('UI/LeftCount.png',True),
 'assets/gameplay/ui/settings-button.png':('cog.png',False),
 'assets/gameplay/ui/return-button.png':('UI/Arrow4.png',False),
 'assets/gameplay/ui/settings/tc.png':('UI/DNAChart.png',True),
 'assets/gameplay/ui/settings/dk.png':('UI/Box.png',True),
 'assets/gameplay/ui/settings/kg.png':('UI/check1.png',False),
 'assets/gameplay/ui/settings/jdt1.png':('UI/Bar2.png',True),
 'assets/gameplay/ui/settings/jdt2.png':('UI/Bar1.png',True),
 'assets/gameplay/ui/gene-panel/tc.png':('UI/DNAChart.png',True),
 'assets/gameplay/ui/gene-panel/dk.png':('UI/Box.png',True),
 'assets/gameplay/ui/gene-panel/xk1.png':('UI/check2.png',True),
 'assets/gameplay/ui/gene-panel/xk2.png':('UI/check1.png',True),
 'assets/gameplay/ui/gene-panel/dg.png':('checkmark.png',False),
 'assets/gameplay/ui/gene-panel/xql.png':('arrow1.png',False),
 'assets/gameplay/ui/gene-panel/yy.png':('circle.png',False),
 'assets/gameplay/upgrade-skin/larvae.png':('larva_1.png',False),
 'assets/gameplay/upgrade-skin/info-badge.png':('icons/Prestige Icons/Monocle.png',False),
 'assets/gameplay/upgrade-skin/panels/panel.png':('UI/DNAChart.png',True),
 'assets/gameplay/upgrade-skin/panels/card.png':('UI/Box.png',True),
 'assets/gameplay/upgrade-skin/panels/pill.png':('UI/LeftCount.png',True),
 'assets/gameplay/upgrade-skin/panels/tab-idle.png':('UI/Button2.png',True),
 'assets/gameplay/upgrade-skin/panels/tab-selected.png':('UI/Button3.png',True),
 'assets/gameplay/upgrade-skin/panels/close.png':('UI/Arrow3.png',False),
 'assets/gameplay/upgrade-skin/panels/jt.png':('UI/Arrow2.png',False),
 'assets/gameplay/upgrade-skin/panels/shade.png':('UI/Box.png',True),
}
for dest,(src,sl) in ui.items(): map_art(dest,src,sl)

# Existing Cocos advertising and publisher-promotion surfaces remain byte-for-byte intact.
for a in audit:
    r=a['path']
    if ('/ad-points/' in r or r.endswith(('/ad1.png','/watch_ad_badge.png')) or
        '/main-menu/promotion/' in r or '/main-menu/entry/' in r or
        r.endswith(('/rkyj.png','/fx.png','/tjzm.png'))): protected.append(r)

# Reconnect legacy replacement characters to original parts and animation frames.
for a in audit:
    p=ROOT/a['path']; r=a['path']; src=None
    if '/textures/art/' in r:
        sub=r.split('/textures/art/')[1]
        if (ART/sub).exists(): src=sub
        if sub.startswith('forager/run/'): src='units/forager_head.png'
        if sub.startswith('hauler/five/idle_'): src='units/antidle.png'
        if sub.startswith('hauler/five/run_'):
            frame=int(p.stem.split('_')[-1]);src='units/'+['ant','ant2','ant3','ant2','ant'][frame]+'.png'
        if sub.startswith('thrower/'): src={'body.png':'units/bigcrab.png','hand_left.png':'units/LeftArm.png','hand_right.png':'units/RightArm.png'}[p.name]
        if src:
            target=ROOT/('assets/gameplay/original/'+src); mapping[target]=ART/src; redirects[p]=target
    if r.startswith('assets/gameplay/audio/sfx/'):
        redirects[p]=ROOT/('assets/gameplay/original/audio/'+p.name)

# All declared sources must exist before writing any project assets.
for dest,src in mapping.items():
    safe(dest)
    if not src.is_file(): raise FileNotFoundError(src)

def refresh_meta(p):
    mp=Path(str(p)+'.meta'); meta=read(mp) if mp.exists() else copy.deepcopy(template)
    if not mp.exists():
        old=meta['uuid']; new=str(uuid.uuid4()); meta=json.loads(json.dumps(meta).replace(old,new))
    if p.suffix.lower() not in ['.png','.jpg']: return
    im=Image.open(p); w,h=im.size
    # Full rectangles preserve original canvas/pivots; Cocos rebuilds derived geometry on import.
    for sub in meta['subMetas'].values():
        sub['displayName']=p.stem
        if sub['importer']=='sprite-frame':
            u=sub['userData'];u.update(rawWidth=w,rawHeight=h,width=w,height=h,trimX=0,trimY=0,offsetX=0,offsetY=0,trimType='none')
            u.pop('vertices',None)
            border=min(12,w//4,h//4) if p in sliced else 0
            for k in ['borderTop','borderBottom','borderLeft','borderRight']:u[k]=border
    write(mp,meta)

for p,s in mapping.items():
    if p in redirects: continue
    p.parent.mkdir(parents=True,exist_ok=True)
    same=p.exists() and digest(p)==digest(s)
    if not same:
        shutil.copy2(s,p)
        # Keep large ocean texture within the previous mobile texture budget.
        if p.name=='Waves.png':
            im=Image.open(s);im.thumbnail((4096,4096),Image.Resampling.LANCZOS);im.save(p)
    if p.suffix=='.png':refresh_meta(p)
    changed.append({'path':relative(p),'source':str(s),'identicalBefore':same})

# Compose portrait backgrounds from the original title-screen and world textures.
for dest,src in [('assets/textures/main-menu/bjt.jpg','title_screen.png'),('assets/textures/loading-skin/bjt.jpg','title_screen.png'),('assets/textures/Game/game_bg.jpg','Environment/bg.png')]:
    p=ROOT/dest;old=Image.open(p).size;im=Image.open(ART/src).convert('RGB')
    im=ImageOps.fit(im,old,Image.Resampling.LANCZOS,centering=(.28,.5) if 'title_screen' in src else (.5,.5));im.save(p,quality=94)
    refresh_meta(p);changed.append({'path':dest,'source':str(ART/src),'transform':'portrait crop '+str(old)})

map_art('assets/textures/main-menu/original-logo.png','Logo_CN.png')
p=ROOT/'assets/textures/main-menu/original-logo.png';shutil.copy2(ART/'Logo_CN.png',p);refresh_meta(p)
changed.append({'path':relative(p),'source':str(ART/'Logo_CN.png')})

uuidmap={read(Path(str(old)+'.meta'))['uuid']:read(Path(str(new)+'.meta'))['uuid'] for old,new in redirects.items()}
for p in (ROOT/'assets').rglob('*'):
    if p.suffix not in ['.scene','.prefab','.ts']:continue
    text=p.read_text(encoding='utf-8');new=text
    for old,target in uuidmap.items():new=new.replace(old,target)
    new=new.replace("'audio/sfx/", "'original/audio/")
    if new!=text:p.write_text(new,encoding='utf-8')
write(ROOT/'reports/upgrade-original-paths.json',upgrade_paths)
(ROOT/'assets/scripts/config/UpgradeArtConfig.ts').write_text('// Original EXE artwork, shared with world assets.\nexport const UPGRADE_ART: Record<string,string> = '+json.dumps(upgrade_paths,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')

for old,new in redirects.items():
    safe(old).unlink();safe(Path(str(old)+'.meta')).unlink()
    removed.append({'path':relative(old),'reason':'merged','target':relative(new)})

def frame(src):return {'__uuid__':read(ROOT/('assets/gameplay/original/'+src+'.png.meta'))['uuid']+'@f9941','__expectedType__':'cc.SpriteFrame'}
for p in (ROOT/'assets/gameplay/prefabs/characters').glob('*.prefab'):
    a=read(p)
    if p.stem=='Forager':
        for o in a:
            if 'runFrames' in o:o['runFrames']=[]
            if o.get('__type__')=='cc.Node' and o.get('_name') in ['Head','Tail','Claws','Shadow2']:
                o['_active']=True
                if o['_name']=='Head':o['_lpos'].update(x=-1,y=15)
                if o['_name']=='Tail':o['_lpos'].update(x=-29,y=16)
                for c in o.get('_components',[]):
                    comp=a[c['__id__']]
                    if comp['__type__']=='cc.Sprite':comp['_sizeMode']=2
    if p.stem=='Thrower':
        for o in a:
            if 'bodyNormalFrame' in o:o['bodyNormalFrame']=None;o['bodyRestFrame']=None
    if p.stem=='Hauler':
        for o in a:
            if 'idleFrame' in o:
                for i in range(1,6):o['idleFrame'+(str(i) if i>1 else '')]=frame('units/antidle')
                for i in range(1,4):o['carryFrame'+str(i)]=frame('units/ant_carrying'+str(i))
                o['throwFrame']=frame('units/ant_carrying')
    write(p,a)

# Remove only static, unreferenced media outside dynamically loaded bundles.
alltext='\n'.join(p.read_text(encoding='utf-8') for p in (ROOT/'assets').rglob('*') if p.suffix in ['.ts','.scene','.prefab','.effect'])
for p in (ROOT/'assets/textures').rglob('*'):
    if p.suffix not in ['.png','.jpg'] or relative(p) in protected or p.name=='original-logo.png':continue
    meta=read(Path(str(p)+'.meta'))
    if meta['uuid'] not in alltext:
        safe(p).unlink();safe(Path(str(p)+'.meta')).unlink();removed.append({'path':relative(p),'reason':'no serialized or script UUID references; outside dynamic bundles'})

# Folder metadata is required for newly introduced canonical art directories.
for p in sorted((ROOT/'assets').rglob('*')):
    if p.is_dir() and not Path(str(p)+'.meta').exists():write(Path(str(p)+'.meta'),{'ver':'1.2.0','importer':'directory','imported':True,'uuid':str(uuid.uuid4()),'files':[],'subMetas':{},'userData':{}})
for p in sorted((ROOT/'assets').rglob('*'),key=lambda p:len(p.parts),reverse=True):
    if p.is_dir() and not any(p.iterdir()):
        safe(p).rmdir();mp=Path(str(p)+'.meta')
        if mp.exists():safe(mp).unlink()

write(REPORT,{'backup':str(backup),'source':str(SRC),'changed':changed,'removed':removed,'protectedAdvertising':protected,'uuidRedirects':uuidmap})
print(json.dumps({'backup':str(backup),'importedOrVerified':len(changed),'removed':len(removed),'preservedAdvertising':len(protected)},ensure_ascii=False))
