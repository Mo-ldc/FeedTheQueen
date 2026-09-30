const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
let checked = 0;
for (const file of walk(path.resolve(__dirname, '../assets')).filter(p => /\.(scene|prefab)$/.test(p))) {
    const objects = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (let index = 0; index < objects.length; index++) {
        const info = objects[index];
        if (info.__type__ !== 'cc.PrefabInfo' || !info.instance) continue;
        const seen = new Set();
        let current = info;
        while (current?.instance) {
            const instanceIndex = current.instance.__id__;
            assert(!seen.has(instanceIndex), `${file}: prefab instance owner loop at ${instanceIndex}`);
            seen.add(instanceIndex);
            const owner = objects[instanceIndex].prefabRootNode;
            if (!owner) break; // Top-level scene instances do not belong to another prefab.
            const parentInfo = objects[owner.__id__]._prefab;
            current = parentInfo ? objects[parentInfo.__id__] : null;
        }
        checked++;
    }
}
console.log(`Prefab instance owner chains checked: ${checked}; no cycles.`);
