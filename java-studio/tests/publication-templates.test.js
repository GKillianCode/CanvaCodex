import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeDescriptionLibrary,composeDescription} from '../src/publicationTemplates.js';
import {normalizePublication} from '../src/videoWorkflow.js';
import {nextCreationName,makeVideoProject,makeCreation} from '../src/videoProjects.js';
test('description templates compose fixed content and replaceable blocks without changing shared data',()=>{
 const library=normalizeDescriptionLibrary({templates:[{id:'java',name:'Java',intro:'Début',outro:'Fin',slots:[{id:'version',label:'Version',defaultBlockId:'java1'},{id:'tools',label:'Outils'}]}],blocks:[{id:'java1',name:'Java 1',content:'Depuis Java 1'},{id:'ide',name:'IDE',content:'Mon IDE'}]});
 assert.equal(composeDescription(library.templates[0],library,{tools:{blockId:'ide'}}),'Début\n\nDepuis Java 1\n\nMon IDE\n\nFin');
 assert.equal(composeDescription(library.templates[0],library,{version:{custom:'Depuis Java 8'}}),'Début\n\nDepuis Java 8\n\nFin');
 assert.equal(library.blocks[0].content,'Depuis Java 1');
 const raw={descriptionRecipe:{templateId:'java',values:{version:{custom:'test'}}}};assert.equal(normalizePublication(raw).descriptionRecipe.values.version.custom,'test');
 assert.equal(normalizeDescriptionLibrary({templates:[{id:'a'},{id:'a'}]}).templates.length,1);
});
test('blank support names use the next available per-app number',()=>{
 const project=makeVideoProject('Test');project.creations=[{app:'banners',name:'Incrustation - 1'},{app:'banners',name:'Incrustation - 3'}];
 assert.equal(nextCreationName(project,'banners'),'Incrustation - 2');
 assert.equal(nextCreationName(project,'slides'),'Diaporama - 1');
 assert.equal(makeCreation(project,'thumbnails','').name,'Miniature - 1');
 assert.equal(nextCreationName(project,'animation'),'Animation - 1');
});
