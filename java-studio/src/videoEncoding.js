export const videoFormats=[['mov','MOV · QTRLE'],['mkv','MKV · FFV1'],['webm','WebM']];
export async function ensureVideoEncoder(format,{signal,fetcher=globalThis.fetch}={}){
 if(format==='webm')return null;
 if(!['mov','mkv'].includes(format))throw Error('Format vidéo inconnu.');
 let response,value;
 try{response=await fetcher('/__frame_video__/capabilities',{signal,cache:'no-store'});value=await response.json();}catch(error){if(error.name==='AbortError')throw error;throw Error('Encodage local indisponible. Relance Frame avec npm run dev ou npm run preview.');}
 if(!response.ok||!value?.formats?.[format]||!value.token)throw Error(value?.error||'Ce codec n’est pas disponible dans FFmpeg.');
 return value.token;
}
export async function encodeVideo(blob,format,{signal,fetcher=globalThis.fetch}={}){
 const token=await ensureVideoEncoder(format,{signal,fetcher});
 const response=await fetcher('/__frame_video__/encode?format='+format,{method:'POST',headers:{'Content-Type':'video/quicktime','X-Frame-Video-Token':token},body:blob,signal});
 if(!response.ok){let value;try{value=await response.json();}catch{}throw Error(value?.error||'L’encodage local a échoué.');}
 const output=await response.blob();if(!output.size)throw Error('Le fichier encodé est vide.');return output;
}
