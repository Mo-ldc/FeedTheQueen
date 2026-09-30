const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const root=path.resolve(__dirname,'..');process.chdir(root);
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk('assets'), metas=files.filter(p=>p.endsWith('.meta'));
const ids=new Set(),errors=[],uuidOwners=new Map();
for(const p of metas){const m=JSON.parse(fs.readFileSync(p));if(!fs.existsSync(p.slice(0,-5)))errors.push('Orphan meta: '+p);function visit(x){if(x.uuid){ids.add(x.uuid);if(uuidOwners.has(x.uuid))errors.push('Duplicate UUID: '+p+' / '+uuidOwners.get(x.uuid));uuidOwners.set(x.uuid,p);}for(const s of Object.values(x.subMetas||{}))visit(s);}visit(m);}
const unresolved=[];
for(const p of files.filter(p=>/\.(scene|prefab)$/.test(p))){const a=JSON.parse(fs.readFileSync(p));function visit(x){if(!x||typeof x!=='object')return;if(x.__id__!==undefined&&!a[x.__id__])errors.push('Invalid object reference: '+p+' '+x.__id__);if(x.__uuid__&&!ids.has(x.__uuid__))unresolved.push({file:p,uuid:x.__uuid__});for(const v of Object.values(x))visit(v);}a.forEach(visit);}
const git='C:/Users/A/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe';
const baseline='backup-before-original-art';
const baselineRefs=new Set();
for(const p of files.filter(p=>/\.(scene|prefab)$/.test(p))){const s=cp.execFileSync(git,['show',baseline+':'+p.replaceAll('\\','/')],{encoding:'utf8',maxBuffer:30e6});for(const m of s.matchAll(/"__uuid__"\s*:\s*"([^"]+)"/g))baselineRefs.add(m[1]);}
const newMissing=unresolved.filter(x=>!baselineRefs.has(x.uuid));
// Existing built-in references are allowed only if they existed in the baseline.
errors.push(...newMissing.map(x=>'New missing UUID: '+JSON.stringify(x)));
const oldAssets=JSON.parse(fs.readFileSync('reports/asset-audit.json')).records;
const removedIds=new Set(oldAssets.filter(a=>!fs.existsSync(a.path)).map(a=>a.uuid));
for(const x of unresolved)if(removedIds.has(x.uuid.split('@')[0]))errors.push('Deleted asset still referenced: '+JSON.stringify(x));
const upgrades=JSON.parse(fs.readFileSync('reports/upgrade-original-paths.json'));
for(const [id,p]of Object.entries(upgrades))if(!fs.existsSync('assets/gameplay/'+p+'.png'))errors.push('Missing upgrade '+id);
const report=JSON.parse(fs.readFileSync('reports/original-migration.json'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const p of report.protectedAdvertising){const before=cp.execFileSync(git,['show',baseline+':'+p],{maxBuffer:20e6});if(hash(before)!==hash(fs.readFileSync(p)))errors.push('Advertisement changed: '+p);}
const media=files.filter(p=>/\.(png|jpg|mp3|wav|ttf)$/.test(p));
const result={errors,serializedFiles:files.filter(p=>/\.(scene|prefab)$/.test(p)).length,upgradeIcons:Object.keys(upgrades).length,advertisingUnchanged:report.protectedAdvertising.length,existingExternalUUIDs:[...new Set(unresolved.map(x=>x.uuid))],mediaBefore:oldAssets.length,mediaAfter:media.length,bytesBefore:oldAssets.reduce((n,x)=>n+x.bytes,0),bytesAfter:media.reduce((n,p)=>n+fs.statSync(p).size,0)};
fs.writeFileSync('reports/asset-validation.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(errors.length)process.exitCode=1;

