const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const source = 'E:/LDC_Cocos_PJ/Cocos3X_2D/喂蚁后/Exe/FEED THE QUEEN/蚂蚁Exported_Assets';
function walk(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
const rel = p => path.relative(root,p).replaceAll('\\','/');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const media = p => /\.(png|jpg|mp3|wav|ogg|ttf|otf)$/i.test(p);
const sources = walk(source).filter(media);
const assets = walk(path.join(root,'assets'));
const textFiles = assets.filter(p=>/\.(ts|scene|prefab|effect)$/.test(p));
const texts = textFiles.map(p=>[rel(p),fs.readFileSync(p,'utf8')]);
const allText = texts.map(x=>x[1]).join('\n');
const records = assets.filter(media).map(p=>{
  const name=path.basename(p), h=hash(p);
  const candidates=sources.filter(s=>path.basename(s).toLowerCase()===name.toLowerCase());
  const exact=candidates.filter(s=>hash(s)===h);
  const meta=JSON.parse(fs.readFileSync(p+'.meta','utf8'));
  const uuid=meta.uuid;
  const refs=texts.filter(([,s])=>s.includes(uuid)).map(([f])=>f);
  const r=rel(p);
  const dynamic=r.startsWith('assets/gameplay/') || r.startsWith('assets/music/');
  return {path:r,bytes:fs.statSync(p).size,uuid,refs,dynamic,source:exact.length?exact[0]:candidates.length===1?candidates[0]:null,identical:exact.length>0,candidates:candidates.length};
});
fs.mkdirSync(path.join(root,'reports'),{recursive:true});
fs.writeFileSync(path.join(root,'reports/asset-audit.json'),JSON.stringify({source,records},null,2));
console.log(JSON.stringify({assets:records.length,matched:records.filter(x=>x.source).length,identical:records.filter(x=>x.identical).length,unmatched:records.filter(x=>!x.source).map(x=>x.path),unusedStatic:records.filter(x=>!x.dynamic&&!x.refs.length).map(x=>x.path)},null,2));
