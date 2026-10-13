// QuickTime video track containing independent RGBA PNG samples. No alpha-lossy encoder.
const utf=s=>new TextEncoder().encode(s);
const cat=(...parts)=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;};
const u16=n=>new Uint8Array([(n>>>8)&255,n&255]);
const u32=n=>new Uint8Array([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]);
const zeros=n=>new Uint8Array(n);
const box=(name,...parts)=>{const data=cat(...parts);return cat(u32(data.length+8),utf(name),data);};
const full=(name,flags,...parts)=>box(name,u32(flags),...parts);
const matrix=cat(u32(0x10000),u32(0),u32(0),u32(0),u32(0x10000),u32(0),u32(0),u32(0),u32(0x40000000));
export function pngMovie(frames,{width,height,fps=30}){
 if(!frames.length||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>8192||height>8192||![24,25,30,60].includes(fps))throw Error('Dimensions ou cadence vidéo invalides.');
 const sizes=frames.map(f=>f.size??f.byteLength),bytes=sizes.reduce((a,b)=>a+b,0);if(sizes.some(n=>!Number.isInteger(n)||n<1)||bytes>256*1024*1024)throw Error('La vidéo dépasse 256 Mo. Réduis sa durée ou sa résolution.');
 const ftyp=box('ftyp',utf('qt  '),u32(0),utf('qt  ')),duration=frames.length;
 const mvhd=full('mvhd',0,u32(0),u32(0),u32(fps),u32(duration),u32(0x10000),u16(0x100),zeros(10),matrix,zeros(24),u32(2));
 const tkhd=full('tkhd',3,u32(0),u32(0),u32(1),u32(0),u32(duration),zeros(8),u16(0),u16(0),u16(0),u16(0),matrix,u32(width*65536),u32(height*65536));
 const mdhd=full('mdhd',0,u32(0),u32(0),u32(fps),u32(duration),u16(0),u16(0));
 const hdlr=full('hdlr',0,u32(0),utf('vide'),zeros(12),utf('Frame Video\0'));
 const name=cat(new Uint8Array([9]),utf('Frame PNG'),zeros(22));
 const sample=box('png ',zeros(6),u16(1),u16(0),u16(0),zeros(12),u16(width),u16(height),u32(72*65536),u32(72*65536),u32(0),u16(1),name,u16(32),u16(0xffff));
 const stsd=full('stsd',0,u32(1),sample),stts=full('stts',0,u32(1),u32(duration),u32(1));
 const stsc=full('stsc',0,u32(1),u32(1),u32(duration),u32(1));
 const stsz=full('stsz',0,u32(0),u32(duration),...sizes.map(u32));
 const stco=full('stco',0,u32(1),u32(ftyp.length+8));
 const stbl=box('stbl',stsd,stts,stsc,stsz,stco);
 const dinf=box('dinf',full('dref',0,u32(1),full('url ',1)));
 const minf=box('minf',full('vmhd',1,u16(0),zeros(6)),dinf,stbl);
 const moov=box('moov',mvhd,box('trak',tkhd,box('mdia',mdhd,hdlr,minf)));
 return new Blob([ftyp,u32(bytes+8),utf('mdat'),...frames,moov],{type:'video/quicktime'});
}
