<script setup>
import {ref,onMounted,onUnmounted} from 'vue';
import {AudienceFrames,audienceMessage} from '../presenterSession.js';
const session=new URLSearchParams(location.search).get('frameAudience'),canvas=ref(null),status=ref('Connexion à la console présentateur…'),fullscreen=ref(false);let lastSequence=-1,lastContact=Date.now(),timer,readyTimer;
function send(action){window.opener?.postMessage({type:'frame-audience-command',session,action},location.origin);}
function ready(){window.opener?.postMessage({type:'frame-audience-ready',session},location.origin);}
const frames=new AudienceFrames({source:window.opener,origin:location.origin,session,paint(bitmap){const c=canvas.value;if(c.width!==bitmap.width||c.height!==bitmap.height){c.width=bitmap.width;c.height=bitmap.height;}c.getContext('2d').drawImage(bitmap,0,0);status.value='';},ack(sequence){lastSequence=sequence;window.opener?.postMessage({type:'frame-audience-painted',session,sequence},location.origin);}});
function receive(event){if(!audienceMessage(event,window.opener,location.origin,session))return;lastContact=Date.now();frames.receive(event);}
function keys(e){if([' ','Enter','PageDown','ArrowRight'].includes(e.key)){e.preventDefault();send('advance');}else if(['Backspace','PageUp','ArrowLeft'].includes(e.key)){e.preventDefault();send('retreat');}else if(e.key==='Escape'&&!document.fullscreenElement)send('exit');}
async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{status.value='Plein écran indisponible. Agrandis cette fenêtre.';}}
function fullscreenChanged(){fullscreen.value=!!document.fullscreenElement;}
onMounted(()=>{document.title='Frame · Public';window.addEventListener('message',receive);window.addEventListener('keydown',keys);document.addEventListener('fullscreenchange',fullscreenChanged);ready();readyTimer=setInterval(()=>{if(lastSequence<0)ready();},500);timer=setInterval(()=>{if(!window.opener||window.opener.closed||Date.now()-lastContact>5000)status.value='Console déconnectée · retourne dans Frame pour relancer la présentation.';},1000);});
onUnmounted(()=>{clearInterval(timer);clearInterval(readyTimer);window.removeEventListener('message',receive);window.removeEventListener('keydown',keys);document.removeEventListener('fullscreenchange',fullscreenChanged);});
</script>
<template><main class="audience-window"><canvas ref="canvas" aria-label="Diapo diffusée au public"/><div v-if="status" class="audience-status" role="status">{{status}}</div><button v-if="!fullscreen" class="audience-fullscreen" @click="toggleFullscreen">Plein écran</button></main></template>
