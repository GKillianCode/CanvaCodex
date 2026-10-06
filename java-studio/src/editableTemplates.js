import { MAX_ELEMENTS } from './limits.js';
import { normalizeShape } from './shapes.js';
import { normalizeTable } from './tables.js';
export const extraPresets=[
 ['table-compare','Tableau comparatif','Comparer des propriétés dans un tableau éditable.'],
 ['four-cards','Quatre repères','Quatre cartes pour structurer une explication.'],
 ['pipeline','Pipeline Java','Trois étapes reliées par des flèches.'],
 ['stack-heap','Stack / Heap','Distinguer les deux espaces mémoire.'],
 ['call-stack','Pile d’appels','Quatre niveaux dans une pile verticale.'],
 ['architecture','Architecture JVM','Trois couches pour décrire un système.'],
 ['decision','Décision','Une question et deux branches possibles.'],
 ['checklist','Checklist','Quatre points de contrôle indépendants.'],
 ['progress','Progression','Trois indicateurs composés de formes éditables.'],
 ['code-notes','Code commenté','Un exemple de code et trois annotations.'],
].map(([id,name,desc])=>({id,name,desc}));
export function clearTemplateDecorations(s){for(const [k,e] of Object.entries(s.elements||{}))if(e.template){delete s.elements[k];delete s.positions[k];delete s.fragments[k];}}
export function materializeTemplate(s){
 s.elements||={};let serial=0;
 const add=(e,p,owner='title')=>{if(Object.keys(s.elements).length>=MAX_ELEMENTS)return null;let key;do{key=e.type+'Template'+serial++;}while(s.elements[key]);s.elements[key]={...e,custom:false,template:true};s.positions[key]={size:30,...p};s.fragments[key]={...(s.fragments[owner]||{order:0,animation:'fade'})};return key;};
 const shape=(name,x,y,w,h,role='panel',kind='rounded',opacity=100,owner='title',radius=8)=>add(normalizeShape({name,shape:kind,fillRole:role,opacity,radius}),{x,y,w,h},owner);
 const text=(value,x,y,w,h,size=30,role='ink',owner='title')=>add({type:'text',name:value,text:value},{x,y,w,h,size,textStyle:{colorRole:role}},owner);
 const order=[];
 for(const key of s.blockKeys||[]){const p=s.positions[key],n=['body','text1','text2'].indexOf(key);if(!p)continue;const extras=[];const push=k=>{if(k)extras.push(k);};
  if(n>=0){
   if(['three','before-after','question'].includes(s.layout)){push(shape('Fond de carte',p.x-32,p.y-104,p.w+64,(p.h||240)+144,'panel','rounded',100,key,5));push(text(s.layout==='before-after'?(n===0?'AVANT':'APRÈS'):s.layout==='question'?'EXPLICATION':String(n+1).padStart(2,'0'),p.x,p.y-65,p.w,34,24,n===1?'secondary':'accent',key));}
   if(['steps','summary'].includes(s.layout)){push(shape('Pastille',p.x-112,p.y,64,64,'accent','rounded',100,key,31));push(text(String(n+1),p.x-88,p.y+15,40,40,28,'bg',key));push(shape('Séparateur',p.x,p.y+(p.h||120)+24,p.w,2,'ink','rect',8,key));}
   if(s.layout==='timeline'){push(shape('Point de chronologie',p.x,p.y-108,24,24,'accent','circle',100,key));push(shape('Lien de chronologie',p.x+28,p.y-98,p.w-8,4,'accent','rect',25,key));push(text(String(n+1).padStart(2,'0'),p.x,p.y-65,p.w,34,24,'accent',key));}
   if(s.layout==='definition'&&key==='body')push(shape('Soulignement',p.x,p.y-56,120,6,'accent','rect',100,key));
  }
  if(key==='title'&&s.label){push(text(s.label,p.x,Math.max(10,p.y-58),p.w,40,23,'accent',key));s.label='';}
  order.push(...extras,key);
 }
 s.blockKeys=order;s.designVersion=3;
}
export function buildExtraTemplate(s){
 if(!extraPresets.some(p=>p.id===s.layout))return;
 // Compositions are ordinary objects; no renderer-only decoration or hidden content.
 s.blockKeys=['title'];s.positions.title={x:128,y:96,w:1664,h:140,size:76};
 let id=0;
 const add=(e,p)=>{if(Object.keys(s.elements).length>=MAX_ELEMENTS)return;const k=e.type+'TemplateExtra'+id++;s.elements[k]={...e,custom:false,template:true};s.positions[k]={size:34,...p};s.fragments[k]={order:0,animation:'fade'};s.blockKeys.push(k);};
 const box=(x,y,w,h,role='panel',kind='rounded')=>add(normalizeShape({name:'Fond / '+role,shape:kind,fillRole:role,radius:7}),{x,y,w,h});
 const txt=(value,x,y,w,h=90,size=34,role='ink')=>add({type:'text',name:value,text:value},{x,y,w,h,size,textStyle:{colorRole:role}});
 const card=(x,y,w,h,title,body)=>{box(x,y,w,h);txt(title,x+32,y+28,w-64,64,36,'accent');txt(body,x+32,y+112,w-64,h-140,32);};
 switch(s.layout){
 case 'table-compare':add(normalizeTable({name:'Comparaison Java',rows:4,columns:3,cells:[['Critère','ArrayList','LinkedList'],['Accès indexé','O(1)','O(n)'],['Ajout en fin','O(1) amorti','O(1)'],['Stockage','Tableau','Nœuds liés']]}),{x:128,y:320,w:1664,h:600});break;
 case 'four-cards':[['01 · Source','Le code que tu écris.'],['02 · Bytecode','Les instructions portables.'],['03 · JVM','L’environnement d’exécution.'],['04 · Machine','Le processeur et la mémoire.']].forEach(([t,b],n)=>card(128+(n%2)*848,320+Math.floor(n/2)*312,816,280,t,b));break;
 case 'pipeline':['Source .java','Bytecode .class','Exécution JVM'].forEach((t,n)=>{card(128+n*592,400,480,400,t,['Écrire le programme.','Compiler avec javac.','Interpréter et optimiser.'][n]);if(n<2)box(632+n*592,548,64,80,'accent','arrow');});break;
 case 'stack-heap':card(128,320,784,600,'STACK','Variables locales\nRéférences\nFrames des méthodes');card(1008,320,784,600,'HEAP','Instances d’objets\nTableaux\nGestion par le GC');break;
 case 'call-stack':['main()','service.execute()','repository.find()','database.query()'].forEach((t,n)=>{box(400,304+n*152,1120,128,n%2?'panel':'accent');txt(t,448,340+n*152,1024,64,40,n%2?'ink':'bg');});break;
 case 'architecture':['Application Java','JVM · runtime','Système et matériel'].forEach((t,n)=>{box(128,320+n*208,1664,176);txt(t,176,378+n*208,1568,80,44,n===1?'accent':'ink');});break;
 case 'decision':box(752,296,416,248,'accent','diamond');txt('Condition ?',832,382,256,70,34,'bg');box(544,576,144,96,'secondary','arrow');box(1232,576,144,96,'accent','arrow');card(128,728,784,224,'OUI','Exécuter cette branche.');card(1008,728,784,224,'NON','Choisir l’alternative.');break;
 case 'checklist':['Contrat de la méthode','Complexité attendue','Cas limites','Résultat vérifié'].forEach((t,n)=>{box(128,320+n*160,72,72,'accent','rounded');txt('✓',148,336+n*160,42,48,34,'bg');txt(t,248,332+n*160,1500,84,42);});break;
 case 'progress':['Chargement','Compilation','Exécution'].forEach((t,n)=>{txt(t,128,320+n*208,480,72,36);box(640,324+n*208,1152,64);box(640,324+n*208,[920,640,360][n],64,'accent');txt([80,56,31][n]+' %',640,410+n*208,1152,56,28,'muted');});break;
 case 'code-notes':s.blockKeys.push('code');s.positions.code={x:128,y:320,w:1000,h:600,size:28};['Signature','Corps de méthode','Valeur de retour'].forEach((t,n)=>card(1216,320+n*208,576,184,t,'Ajoute ton commentaire.'));break;
 }
 s.designVersion=3;
}

export function separateLabels(s){
 const keys=[...(s.blockKeys||[]),...Object.keys(s.elements||{}).filter(k=>s.elements[k].custom&&!s.blockKeys?.includes(k))];
 for(const owner of keys){const e=s.elements[owner],value=owner==='title'?s.label:e?.type==='text'?e.label:'';if(!value||Object.keys(s.elements).length>=MAX_ELEMENTS)continue;
  const p=s.positions[owner];if(!p)continue;const key='textLabel'+crypto.randomUUID().replaceAll('-','');s.elements[key]={type:'text',custom:true,name:'Surtitre',text:value};s.positions[key]={x:p.x,y:Math.max(10,p.y-58),w:p.w,h:40,size:23,font:p.font,rotation:p.rotation||0,textStyle:{colorRole:'accent',weight:700}};s.fragments[key]={...s.fragments[owner]};s.blockKeys=[...(s.blockKeys||[])];const index=s.blockKeys.indexOf(owner);s.blockKeys.splice(index<0?s.blockKeys.length:index,0,key);if(owner==='title')s.label='';else e.label='';
 }
}


export function restoreTemplateLayout(s,old){
 const addedElements=Object.fromEntries(Object.entries(s.elements).filter(([key,e])=>!old.elements[key]&&!e.template));
 const addedPositions=Object.fromEntries(Object.entries(s.positions).filter(([key])=>!old.positions[key]&&!s.elements[key]?.template));
 const addedFragments=Object.fromEntries(Object.entries(s.fragments).filter(([key])=>Object.hasOwn(addedElements,key)));
 for(const key of ['layout','positions','blockKeys','designVersion','groups','elements','fragments','label'])s[key]=JSON.parse(JSON.stringify(old[key]??(key==='groups'?[]:key==='label'?'':{})));
 Object.assign(s.elements,addedElements);Object.assign(s.positions,addedPositions);Object.assign(s.fragments,addedFragments);return s;
}
