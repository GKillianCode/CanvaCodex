import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assetLibraryPlugin } from "../scripts/asset-library-plugin.mjs";
import {builtinMotions} from "../src/animationPresets.js";
import { normalizeThemes } from "../src/themes.js";
test("local asset files persist atomically, reject stale writes and preserve a backup", async () => {
  const directory = await mkdtemp(join(tmpdir(), "frame-assets-test-"));
  let middleware;
  const plugin = assetLibraryPlugin({ directory });
  plugin.configResolved({ root: directory });
  plugin.configureServer({
    middlewares: {
      use(prefix, handler) {
        middleware = handler;
      },
    },
  });
  const server = http.createServer((req, res) => middleware(req, res));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = "http://127.0.0.1:" + server.address().port;
  try {
    const initial = await (await fetch(url + "/themes")).json();
    assert.equal(initial.revision, "empty");
    const value = {
        format: "frame-theme-library",
        version: 1,
        themes: [{ ...normalizeThemes()[0], id: "orange", name: "Orange" }],
        removed: [],
      },
      headers = {
        "Content-Type": "application/json",
        "X-Frame-Assets-Token": initial.token,
        "If-Match": "empty",
      };
    assert.equal(
      (
        await fetch(url + "/themes", {
          method: "PUT",
          headers: { ...headers, "X-Frame-Assets-Token": "wrong" },
          body: JSON.stringify(value),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(url + "/themes", {
          headers: { Origin: "https://example.com" },
        })
      ).status,
      403,
    );
    const writes = await Promise.all(
      [1, 2].map(() =>
        fetch(url + "/themes", {
          method: "PUT",
          headers,
          body: JSON.stringify(value),
        }),
      ),
    );
    assert.deepEqual(writes.map((v) => v.status).sort(), [200, 409]);
    const current = await (await fetch(url + "/themes")).json();
    assert.equal(
      JSON.parse(await readFile(join(directory, "themes.json"), "utf8"))
        .themes[0].name,
      "Orange",
    );
    assert.equal(
      (
        await fetch(url + "/themes", {
          headers: { "If-None-Match": current.revision },
        })
      ).status,
      304,
    );
    value.themes[0].name = "Orange modifié";
    const saved = await fetch(url + "/themes", {
      method: "PUT",
      headers: { ...headers, "If-Match": current.revision },
      body: JSON.stringify(value),
    });
    assert.equal(saved.status, 200);
    assert.equal(
      JSON.parse(await readFile(join(directory, "themes.json.bak"), "utf8"))
        .themes[0].name,
      "Orange",
    );
    assert.equal(
      JSON.parse(await readFile(join(directory, "themes.json"), "utf8"))
        .themes[0].name,
      "Orange modifié",
    );
    const old = await (await fetch(url + "/components")).json();
    assert.equal(old.data.components.length, 0);
    const motions=await(await fetch(url+"/motions")).json();
    const written=await fetch(url+"/motions",{method:"PUT",headers:{...headers,"If-Match":motions.revision},body:JSON.stringify({format:"frame-motion-library",version:1,motions:[builtinMotions[0]]})});
    assert.equal(written.status,200);assert.equal(JSON.parse(await readFile(join(directory,"motions.json"),"utf8")).motions[0].id,builtinMotions[0].id);

  } finally {
    await new Promise((r) => server.close(r));
    await rm(directory, { recursive: true, force: true });
  }
});

test('partial legacy libraries can be read without discarding their original invalid entries', async () => {
  const {normalizeAssetFile}=await import('../scripts/asset-library-plugin.mjs');
  const raw={format:'frame-component-library',version:1,components:[{name:'ancien composant',items:[]}]};
  assert.throws(()=>normalizeAssetFile('components',raw),/Éléments invalides/);
  const readable=normalizeAssetFile('components',raw,{allowPartial:true});
  assert.deepEqual(readable.components,[]);assert.match(readable.warning,/1 élément/);assert.equal(raw.components.length,1);
});

test('reading a partially invalid disk library keeps valid components and refuses destructive rewrites', async () => {
  const directory=await mkdtemp(join(tmpdir(),'frame-partial-assets-'));let middleware;
  const plugin=assetLibraryPlugin({directory});plugin.configResolved({root:directory});plugin.configureServer({middlewares:{use(prefix,fn){middleware=fn;}}});
  const original=JSON.stringify({format:'frame-component-library',version:1,components:[{id:'good',name:'Texte',items:[{id:'text',element:{type:'text',custom:true,text:'Bonjour'},position:{x:0,y:0,w:100,h:50,size:20}}]},{id:'bad',name:'Ancien',items:[]}]});
  await writeFile(join(directory,'components.json'),original);
  const server=http.createServer((req,res)=>middleware(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
  try{
    const response=await fetch(url+'/components'),value=await response.json();assert.equal(response.status,200);assert.equal(value.data.components.length,1);assert.match(value.data.warning,/1 élément/);
    const write=await fetch(url+'/components',{method:'PUT',headers:{'Content-Type':'application/json','X-Frame-Assets-Token':value.token,'If-Match':value.revision},body:JSON.stringify(value.data)});assert.equal(write.status,422);assert.equal(await readFile(join(directory,'components.json'),'utf8'),original);
  }finally{await new Promise(r=>server.close(r));await rm(directory,{recursive:true,force:true});}
});
