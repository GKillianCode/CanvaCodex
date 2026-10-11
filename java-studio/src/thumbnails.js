import {makeOverlay} from './overlays.js';
import {normalizeShape} from './shapes.js';
export const thumbnailCategories=[['java','Java','JAVA SOUS LE CAPOT','BYTECODE\nDÉCRYPTÉ','JVM'],['ai','IA','INTELLIGENCE ARTIFICIELLE','COMPRENDRE\nL’IA','IA'],['design','Conception','ARCHITECTURE & CONCEPTION','DU CODE\nAU SYSTÈME','DESIGN'],['devops','DevOps','AUTOMATISER & LIVRER','LE PIPELINE\nEXPLIQUÉ','CI / CD'],['production','Mise en production','DE LA MACHINE AU SERVEUR','PRÊT POUR\nLA PROD ?','DEPLOY'],['git','Versioning','HISTORIQUE & COLLABORATION','GIT SANS\nCONFUSION','GIT']];
export const thumbnailPresets=thumbnailCategories.flatMap(([category,label,eyebrow,title,badge])=>['focus','split'].map(style=>({id:category+'-'+style,category,label,name:label+' · '+(style==='focus'?'Impact':'Duo'),eyebrow,title,badge,style})));
export function makeThumbnail(id='java-focus'){
 const p=thumbnailPresets.find(p=>p.id===id)||thumbnailPresets[0],s=makeOverlay('chapter');s.elements={};s.positions={};s.fragments={};s.blockKeys=[];s.thumbnailPreset=p.id;s.overlayFormat=undefined;s.overlayName=undefined;
 const add=(key,e,x,y,w,h,size=32)=>{s.elements[key]=e;s.positions[key]={x,y,w,h,size,font:'inter',textRole:'title'};s.fragments[key]={order:0,animation:'none'};s.blockKeys.push(key);};
 const shape=(key,x,y,w,h,role,radius=8)=>add(key,normalizeShape({shape:'rounded',fillRole:role,radius,name:key}),x,y,w,h);
 const text=(key,value,x,y,w,h,size,role='ink')=>{add(key,{type:'text',custom:true,name:key,text:value,weight:700},x,y,w,h,size);s.positions[key].textStyle={weight:700,colorRole:role};};
 shape('shapePanel',p.style==='split'?1030:1230,0,p.style==='split'?890:690,1080,'panel',0);shape('shapeAccent',100,230,110,10,'accent',0);
 text('textCategory',p.eyebrow,100,135,1700,60,32,'accent');text('textTitle',p.title,100,300,p.style==='split'?900:1150,470,112);
 text('textSubtitle','Une explication claire. Un sujet en profondeur.',110,825,1550,75,32,'muted');
 shape('shapeBadge',p.style==='split'?1110:1300,350,p.style==='split'?700:510,330,'accent',14);text('textBadge',p.badge,p.style==='split'?1140:1330,440,p.style==='split'?640:450,140,p.badge.length>5?65:100,'bg');
 if(p.style==='split'){add('imageSubject',{type:'image',custom:true,name:'Visuel du sujet',src:'',fit:'cover'},1070,90,760,890);s.blockKeys.splice(s.blockKeys.indexOf('imageSubject'),1);s.blockKeys.splice(1,0,'imageSubject');}
 return s;
}
