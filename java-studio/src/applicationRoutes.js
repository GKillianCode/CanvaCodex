const routes={notes:'/notes',themes:'/themes',animation:'/animations',slides:'/diaporamas',banners:'/incrustations',thumbnails:'/miniatures',canvas:'/parcours'};
export function applicationFromHash(hash){if(/^#\/notes(?:\/[\w-]+)?$/.test(hash))return 'notes';return Object.keys(routes).find(id=>'#'+routes[id]===hash)||null;}
export function applicationHash(id){return '#'+(routes[id]||'/');}
