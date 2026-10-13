import {ref,onUnmounted} from 'vue';
import {PresenterSession} from './presenterSession.js';
// Only the rendered Canvas crosses into the session-bound public window.
export function usePresenterWindow({notify,command}){
 const connected=ref(false),opened=ref(false),session=new PresenterSession({host:window,bitmap:canvas=>createImageBitmap(canvas),notify,command,status(open,ready){opened.value=open;connected.value=ready;}});
 const receive=event=>session.receive(event),monitor=setInterval(()=>session.heartbeat(),1000);window.addEventListener('message',receive);
 onUnmounted(()=>{clearInterval(monitor);window.removeEventListener('message',receive);session.close();});
 return {connected,opened,open:()=>session.open(),close:()=>session.close(),mirror:(canvas,now)=>session.mirror(canvas,now),diagnostics:()=>({sent:session.sequence,painted:session.receivedFrames})};
}
