import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeConductor,normalizePublication,normalizeWorkflow,newSequence,chapterSeconds,chapterErrors,chaptersText,chaptersFromConductor,updateWorkflowSection} from '../src/videoWorkflow.js';
import {makeVideoProject,normalizeVideoProject,makeCreation,attachCreation,videoBundle,importVideoBundle,videoRoute,videoSummary} from '../src/videoProjects.js';
test('existing video projects gain empty workshops without changing notes or assets',()=>{
 const raw={id:'existing',name:'Java',creations:[],notes:'Private research'},p=normalizeVideoProject(raw);
 assert.deepEqual(p.workflow,normalizeWorkflow());assert.equal(p.notes,raw.notes);assert.deepEqual(p.creations,[]);
 assert.equal('workflow' in videoSummary(p),false);
});
test('normalization bounds production data and rejects duplicate ids and invalid kinds',()=>{
 const sequence=newSequence('A'),raw={revision:Infinity,sequences:[{...sequence,script:'x'.repeat(60000),support:'bad',creationId:123},sequence,null]};
 const value=normalizeConductor(raw);assert.equal(value.revision,0);assert.equal(value.sequences.length,1);assert.equal(value.sequences[0].script.length,50000);assert.equal(value.sequences[0].support,'camera');assert.equal(value.sequences[0].creationId,'');
 assert.equal(normalizeConductor({sequences:Array.from({length:110},(_,i)=>({...sequence,id:String(i)}))}).sequences.length,100);
 assert.equal(normalizePublication({title:'a'.repeat(300),chapters:[{id:'a',time:'12:99'},null,{id:'a'}]}).title.length,200);
 assert.equal(normalizePublication({chapters:[{id:'a'},{id:'a'}]}).chapters.length,1);
});
test('section saves preserve the other workshop and private metadata and detect concurrent edits',()=>{
 const p=makeVideoProject('Cours');p.notes='Private';const conductor=updateWorkflowSection(p,'conductor',{sequences:[newSequence('Intro')]},0);
 const both=updateWorkflowSection(conductor,'publication',{title:'YouTube',description:'Public'},0);
 assert.equal(both.workflow.conductor.sequences.length,1);assert.equal(both.workflow.conductor.revision,1);assert.equal(both.notes,'Private');assert.equal(both.workflow.publication.title,'YouTube');assert.equal(p.workflow.conductor.sequences.length,0);
 assert.throws(()=>updateWorkflowSection(both,'conductor',{sequences:[]},0),/autre fenêtre/);
 assert.equal(updateWorkflowSection(both,'conductor',{sequences:[]},1).workflow.conductor.revision,2);assert.throws(()=>updateWorkflowSection(p,'unknown',{},0),/Atelier/);
});
test('full video roundtrip remaps creation links and thumbnail without copying private notes to publication',()=>{
 const p=makeVideoProject('Cours'),slide=makeCreation(p,'slides','Cours'),thumb=makeCreation(p,'thumbnails','Variante');attachCreation(p,slide);attachCreation(p,thumb);
 p.notes='PRIVATE';p.workflow.conductor.sequences=[{...newSequence('Intro'),support:'slides',creationId:slide.id}];p.workflow.publication={...normalizePublication(),title:'Primitifs Java',thumbnailId:thumb.id,description:'PUBLIC',comment:'Dépôt',chapters:[{id:'chapter',sequenceId:p.workflow.conductor.sequences[0].id,time:'00:00',title:'Intro'}]};
 const restored=importVideoBundle(JSON.parse(JSON.stringify(videoBundle(p,[slide,thumb]))));
 assert.notEqual(restored.project.id,p.id);assert.notEqual(restored.creations[0].id,slide.id);assert.equal(restored.project.workflow.conductor.sequences[0].creationId,restored.creations[0].id);assert.equal(restored.project.workflow.publication.thumbnailId,restored.creations[1].id);assert.equal(restored.project.workflow.publication.description,'PUBLIC');assert.equal(restored.project.notes,'PRIVATE');assert.equal(restored.project.workflow.publication.chapters[0].sequenceId,restored.project.workflow.conductor.sequences[0].id);
});
test('chapter text validates timestamps, ordering and preserves final timing by sequence id',()=>{
 assert.equal(chapterSeconds('01:02'),62);assert.equal(chapterSeconds('1:02:03'),3723);for(const value of ['1','1:2','1:60','1:60:00','-1:02','NaN'])assert.equal(chapterSeconds(value),null);
 const seq=[newSequence('Intro'),newSequence('Démonstration')],existing=[{id:'kept',sequenceId:seq[1].id,time:'02:12',title:'Old'}],chapters=chaptersFromConductor(seq,existing);assert.equal(chapters[1].id,'kept');assert.equal(chapters[1].time,'02:12');assert.equal(chapters[1].title,'Démonstration');assert.ok(chapterErrors(chapters).length);chapters[0].time='00:00';assert.deepEqual(chapterErrors(chapters),[]);assert.equal(chaptersText(chapters),'00:00 Intro\n02:12 Démonstration');chapters[1].time='00:00';assert.ok(chapterErrors(chapters).length);
});
test('workshop and independent reader routes survive refresh without matching foreign routes',()=>{
 assert.deepEqual(videoRoute('#/videos/a/conductor'),{videoId:'a',app:null,creationId:null,workshop:'conductor',reader:false});assert.equal(videoRoute('#/videos/a/conductor/read').reader,true);assert.equal(videoRoute('#/videos/a/publication').workshop,'publication');assert.equal(videoRoute('#/videos/a/publication/read'),null);assert.equal(videoRoute('#/videos/a/conductor/unexpected'),null);
});

test('conductor illustrations survive serialization and reject external or oversized sources', async()=>{
 const {normalizeConductorImages}=await import('../src/videoWorkflow.js');
 const images=[{src:'data:image/png;base64,YQ==',alt:'Huit bits'}, {src:'https://example.com/private.png'}, {src:'data:image/svg+xml;base64,YQ=='}, {src:'data:image/png;base64,'+'A'.repeat(3000000)}];
 assert.deepEqual(normalizeConductorImages(images),[{id:'legacy-0',src:'data:image/png;base64,YQ==',alt:'Huit bits',width:50,align:'center'}]);
 const normalized=normalizeWorkflow({conductor:{sequences:[{id:'part',images}]}});
 assert.equal(normalized.conductor.sequences[0].images.length,1);
 assert.deepEqual(normalizeWorkflow(JSON.parse(JSON.stringify(normalized))),normalized);
});
test('colored highlighting remains escaped Markdown and leaves code unchanged', async()=>{
 const {highlightScript}=await import('../src/videoWorkflow.js');
 const {renderNotebook}=await import('../src/notebookMarkdown.js');
 assert.equal(highlightScript('une règle',4,9,'yellow'),'une ==yellow|règle==');
 assert.equal(highlightScript('texte',0,5,'red'),'texte');
 const html=renderNotebook('==blue|<img src=x onerror=alert(1)>==');
 assert.match(html,/<mark style="background:#a9d7ff;color:#17231f" data-highlight="blue">&lt;img/);
 assert.doesNotMatch(html,/<img/);
 assert.match(renderNotebook('`==yellow|code==`'),/<code>==yellow\|code==<\/code>/);
});

test('conductor draft updates the existing notes field without becoming a sequence',()=>{
 const project=makeVideoProject('Java');project.notes='Ancien carnet';
 const next=updateWorkflowSection(project,'conductor',{...project.workflow.conductor,draft:'Idées en texte simple'},0);
 assert.equal(next.notes,'Idées en texte simple');
 assert.deepEqual(next.workflow.conductor.sequences,[]);
 assert.equal(next.workflow.publication.title,'');
 assert.equal(project.notes,'Ancien carnet');
 assert.equal('draft' in next.workflow.conductor,false);
});
