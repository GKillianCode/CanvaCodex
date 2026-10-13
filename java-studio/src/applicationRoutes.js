const routes={slides:'/diaporamas',banners:'/incrustations',thumbnails:'/miniatures'};
export function applicationFromHash(hash){return Object.keys(routes).find(id=>'#'+routes[id]===hash)||null;}
export function applicationHash(id){return '#'+(routes[id]||'/');}
