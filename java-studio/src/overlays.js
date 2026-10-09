import {normalizeBits} from './bits.js';
import {setPrimitive} from './javaPrimitives.js';
import { makeSlide, normalizeSlide } from './model.js';
import { normalizeShape } from './shapes.js';
export const overlayFormats = [
 ['lower','Bandeau de titre','Titres'],['chapter','Titre de chapitre','Titres'],['tip','À retenir','Informations'],['video','Voir une autre vidéo','Vidéo'],
 ['video-thumbnail','Vidéo avec miniature','Vidéo'],['speaker','Portrait intervenant','Titres'],['nameplate','Cartouche compact','Titres'],['headline','Titre panoramique','Titres'],['section','Numéro de chapitre','Titres'],['quote','Citation','Informations'],['definition','Définition','Informations'],['warning','Attention','Informations'],['success','Validation','Informations'],['checklist','Liste de contrôle','Informations'],['steps','Trois étapes','Informations'],['stat','Chiffre clé','Informations'],['compare','Avant / après','Informations'],['subscribe','Abonnement','Social'],['social','Profil social','Social'],['website','Lien du site','Social'],['podcast','Épisode podcast','Social'],['credits','Crédits','Titres'],['endcard','Écran de fin','Vidéo'],['product','Fiche produit','Vidéo'],['java-primitive','Fiche de type Java','Java'],['java-bits','Octets et bits','Java'],
].map(([id,name,category])=>({id,name,category}));
export function makeOverlay(id='lower',legacy={}){
 const format=overlayFormats.find(f=>f.id===id)||overlayFormats[0];
 const s=makeSlide('title');s.elements={};s.positions={};s.fragments={};s.blockKeys=[];s.designVersion=3;s.title='';s.body='';s.code='';s.label='';s.overlayFormat=format.id;s.overlayName=format.name;
 const add=(key,e,x,y,w,h,size=32)=>{key=key.normalize('NFD').replace(/[\u0300-\u036f]/g,'');s.elements[key]=e;s.positions[key]={x,y,w,h,size,font:e.type==='text'?(e.weight===700?'inter':'montserrat'):'inter',textRole:e.weight===700?'subtitle':'body'};s.fragments[key]={order:0,animation:'fade'};s.blockKeys.push(key);};
 const box=(key,x,y,w,h,role='bg',radius=8)=>add('shape'+key,normalizeShape({shape:'rounded',name:key,fillRole:role,radius,filled:true}),x,y,w,h);
 const txt=(key,text,x,y,w,h,size=34,role='ink',bold=false)=>{add('text'+key,{type:'text',custom:true,name:key,text,weight:bold?700:400},x,y,w,h,size);s.positions[('text'+key).normalize('NFD').replace(/[\u0300-\u036f]/g,'')].textStyle={weight:bold?700:400,colorRole:role};};
 const img=(key,x,y,w,h)=>add('image'+key,{type:'image',custom:true,name:key,src:'',fit:'cover',background:false,roundedCorners:true,cornerRadius:6},x,y,w,h);
 const title=legacy.title||'Votre titre ici',sub=legacy.subtitle||'À DÉCOUVRIR',note=legacy.note||'Une autre vidéo sur la chaîne';
 switch(format.id){
 case 'java-primitive':
  box('Carte',180,200,1560,680,'bg',6);box('Liseré',180,200,9,680,'accent',0);
  txt('Label','JAVA · TYPE PRIMITIF',230,245,1380,40,23,'accent',true);txt('Type','int',230,300,480,110,86,'ink',true);txt('Width','4 octets · 32 bits',810,320,870,70,40,'accent',true);
  box('Minimum',230,440,700,135,'panel',10);box('Maximum',970,440,700,135,'panel',10);
  txt('MinimumLabel','VALEUR MINIMUM',255,460,640,32,20,'muted',true);txt('Minimum','−2 147 483 648',255,505,640,55,32,'ink',true);
  txt('MaximumLabel','VALEUR MAXIMUM',995,460,640,32,20,'muted',true);txt('Maximum','2 147 483 647',995,505,640,55,32,'ink',true);
  txt('DefaultLabel','VALEUR PAR DÉFAUT',230,610,400,34,20,'muted',true);txt('Default','0',230,655,320,60,46,'accent',true);txt('TypeNote','Entier signé · complément à deux',620,612,1040,110,26);
  txt('DefaultNote','',230,766,1390,80,23,'muted');setPrimitive(s,'int');break;
 case 'java-bits':box('Carte',180,230,1560,620,'bg',6);txt('Label','REPRÉSENTATION BINAIRE',230,270,1450,38,23,'accent',true);txt('Titre','Un octet. Huit bits.',230,335,1450,80,58,'ink',true);add('bitsValue',normalizeBits({value:'151',bytes:1,showWeights:true}),230,450,1450,270);txt('Note','Poids fort à gauche · 151 = 128 + 16 + 4 + 2 + 1',230,760,1450,45,25,'muted');break;

 case 'lower':box('Fond',110,800,1660,190);box('Accent',110,800,9,190,'accent');txt('Surtitre',sub,155,833,1550,42,25,'accent',true);txt('Titre',title,155,883,1550,82,48,'ink',true);break;
 case 'chapter':box('Fond',200,385,1520,300);txt('Surtitre',sub,265,435,1370,45,27,'accent',true);txt('Titre',title,265,495,1370,145,64,'ink',true);break;
 case 'tip':case 'warning':case 'success':box('Carte',1080,80,730,240);box('Accent',1080,80,8,240,format.id==='warning'?'secondary':'accent');txt('Label',format.id==='tip'?'À RETENIR':format.id==='warning'?'ATTENTION':'BIEN JOUÉ',1120,112,640,42,24,'accent',true);txt('Texte',title,1120,163,640,125,42,'ink',true);break;
 case 'video':box('Carte',1040,730,770,260);box('Bouton',1080,770,120,120,'accent',16);add('shapeLecture',normalizeShape({shape:'triangle',fillRole:'bg'}),1125,800,55,60);s.positions.shapeLecture.rotation=90;txt('Surtitre',sub,1232,766,530,36,22,'accent',true);txt('Titre',title,1232,813,530,88,36,'ink',true);txt('Note',note,1080,923,690,40,24);break;
 case 'video-thumbnail':box('Carte',850,680,950,330);img('Miniature',878,708,400,225);txt('Label','À REGARDER ENSUITE',1310,712,450,45,24,'accent',true);txt('Titre',title,1310,775,450,135,38,'ink',true);txt('Note',note,890,955,860,34,24);break;
 case 'speaker':box('Carte',100,770,820,250);img('Portrait',128,800,180,180);txt('Nom','Prénom Nom',340,820,530,75,48,'ink',true);txt('Fonction','Fonction · Organisation',340,905,530,55,28,'accent');break;
 case 'nameplate':box('Carte',100,890,630,115);txt('Nom','Prénom Nom',130,917,560,65,42,'ink',true);break;
 case 'headline':box('Fond',0,860,1920,190);txt('Titre',title,100,900,1720,100,62,'ink',true);box('Liseré',0,860,1920,8,'accent');break;
 case 'section':box('Numéro',100,410,220,220,'accent');txt('Numéro','01',125,452,175,130,100,'bg',true);box('Titre',340,410,1300,220);txt('Titre',title,385,470,1210,115,60,'ink',true);break;
 case 'quote':box('Carte',300,660,1320,340);txt('Citation','« Une idée qui mérite d’être partagée. »',355,710,1200,160,52,'ink',true);txt('Auteur','Prénom Nom · Source',355,910,1200,45,28,'accent');break;
 case 'definition':box('Carte',110,720,1260,290);txt('Terme','Le mot du jour',155,755,1150,70,48,'accent',true);txt('Définition','Une définition claire et concise.',155,850,1150,100,36);break;
 case 'checklist':box('Carte',1250,130,570,780);txt('Titre','À vérifier',1295,180,475,70,44,'accent',true);txt('Liste','Première action\nDeuxième action\nTroisième action',1295,300,470,500,36);s.positions.textListe.textStyle.list={type:'check',indent:50,gap:15,spacing:26};break;
 case 'steps':for(let i=0;i<3;i++){box('Carte'+i,100+i*580,810,550,190);txt('Étape'+i,String(i+1).padStart(2,'0'),125+i*580,835,80,70,48,'accent',true);txt('Texte'+i,['Préparer','Créer','Partager'][i],230+i*580,860,380,90,38,'ink',true);}break;
 case 'stat':box('Carte',1200,670,580,330);txt('Valeur','98 %',1250,705,480,150,108,'accent',true);txt('Label','Votre indicateur clé',1250,895,480,60,30);break;
 case 'compare':for(let i=0;i<2;i++){box('Carte'+i,120+i*860,770,820,240);txt('Label'+i,i?'APRÈS':'AVANT',165+i*860,805,720,40,26,i?'accent':'secondary',true);txt('Texte'+i,i?'Le résultat amélioré':'Le point de départ',165+i*860,875,720,90,42,'ink',true);}break;
 case 'subscribe':box('Bouton',610,830,700,160,'accent',30);txt('Action','Abonnez-vous',660,873,600,80,52,'bg',true);break;
 case 'social':box('Carte',100,825,860,175);box('Badge',130,855,115,115,'accent',45);txt('Symbole','@',153,869,75,90,60,'bg',true);txt('Profil','@votreprofil',280,875,630,75,48,'ink',true);break;
 case 'website':box('Carte',440,890,1040,120);txt('Lien','votre-site.fr',490,915,940,70,44,'accent',true);break;
 case 'podcast':box('Carte',110,730,1100,270);img('Couverture',140,760,210,210);txt('Épisode','ÉPISODE 12',390,765,765,45,26,'accent',true);txt('Titre','Le titre de votre épisode',390,830,765,115,48,'ink',true);break;
 case 'credits':box('Carte',1240,490,570,520);txt('Label','CRÉDITS',1280,530,480,45,26,'accent',true);txt('Crédits','Réalisation · Prénom Nom\nImages · Votre source\nMusique · Votre artiste',1280,625,480,335,30);break;
 case 'endcard':box('Carte',110,500,1700,500);img('Vidéo1',150,540,720,405);img('Vidéo2',1020,540,720,405);txt('Titre','À suivre sur la chaîne',110,370,1700,90,62,'ink',true);break;
 case 'product':box('Carte',1040,470,770,540);img('Produit',1080,510,690,260);txt('Nom','Votre produit',1080,815,690,70,48,'ink',true);txt('Prix','Dès 49 € · En savoir plus',1080,915,690,55,32,'accent');break;
 }
 if(format.id==='warning')for(const p of Object.values(s.positions)){p.x-=960;p.y+=620;}
 if(format.id==='success')for(const p of Object.values(s.positions)){p.x-=960;p.y+=320;}
 return s;
}
export function normalizeOverlay(raw){
 if(raw?.slide){try{const slide=normalizeSlide(raw.slide);slide.overlayFormat=overlayFormats.some(f=>f.id===raw.type)?raw.type:'lower';slide.overlayName=String(raw.slide.overlayName||overlayFormats.find(f=>f.id===slide.overlayFormat).name).slice(0,100);return {type:slide.overlayFormat,slide};}catch{}}
 const type=overlayFormats.some(f=>f.id===raw?.type)?raw.type:'lower';return {type,slide:makeOverlay(type,raw||{})};
}
