const routes={themes:'/themes',animation:'/animations',slides:'/diaporamas',banners:'/incrustations',thumbnails:'/miniatures',canvas:'/parcours'};
export function applicationFromHash(hash){return Object.keys(routes).find(id=>'#'+routes[id]===hash)||null;}
export function applicationHash(id){return '#'+(routes[id]||'/');}
