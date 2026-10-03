export const fonts=[
 {id:'arial',name:'Arial',css:'Arial, sans-serif',local:true},
 {id:'georgia',name:'Georgia',css:'Georgia, serif',local:true},
 {id:'times',name:'Times New Roman',css:'"Times New Roman", serif',local:true},
 {id:'monospace',name:'Monospace système',css:'monospace',local:true,mono:true},
 {id:'inter',weights:[100, 200, 300, 400, 500, 600, 700, 800, 900],italic:true,name:'Inter',css:'"Inter", sans-serif'},
 {id:'dm-sans',weights:[100, 200, 300, 400, 500, 600, 700, 800, 900],italic:true,name:'DM Sans',css:'"DM Sans", sans-serif'},
 {id:'space-grotesk',weights:[300, 400, 500, 600, 700],italic:false,name:'Space Grotesk',css:'"Space Grotesk", sans-serif'},
 {id:'montserrat',weights:[100, 200, 300, 400, 500, 600, 700, 800, 900],italic:true,name:'Montserrat',css:'"Montserrat", sans-serif'},
 {id:'lora',weights:[400, 500, 600, 700],italic:true,name:'Lora',css:'"Lora", serif'},
 {id:'jetbrains-mono',weights:[100, 200, 300, 400, 500, 600, 700, 800],italic:true,name:'JetBrains Mono',css:'"JetBrains Mono", monospace',mono:true},
 {id:'fira-code',weights:[300, 400, 500, 600, 700],italic:false,name:'Fira Code',css:'"Fira Code", monospace',mono:true},
 {id:'ibm-plex-mono',weights:[100, 200, 300, 400, 500, 600, 700],italic:true,name:'IBM Plex Mono',css:'"IBM Plex Mono", monospace',mono:true},
];
export function normalizeFont(id,type='text'){return fonts.some(f=>f.id===id&&(type!=='code'||f.mono))?id:type==='code'?'monospace':'arial';}
export function fontCss(id,type='text'){return fonts.find(f=>f.id===normalizeFont(id,type)).css;}
export function usedFonts(slides){return [...new Set(slides.flatMap(s=>Object.entries(s.positions).filter(([key])=>!['image','shape'].includes(s.elements?.[key]?.type)).map(([key,p])=>normalizeFont(p.font,key==='code'||s.elements?.[key]?.type==='code'?'code':'text'))))];}
