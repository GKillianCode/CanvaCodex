import {createApp} from 'vue';
import App from './App.vue';
import './style.css';
import './light.generated.css';
import './appearance.css';
import {initAppearance} from './appearance.js';

import AudienceWindow from './components/AudienceWindow.vue';
import {initLocalPersistence,downloadLocalRecovery} from './localPersistence.js';
async function start(){
 const root=document.getElementById('app');root.textContent='Ouverture des données locales…';
 try{await initLocalPersistence({progress:message=>root.textContent=message});initAppearance();createApp(new URLSearchParams(location.search).has('frameAudience')?AudienceWindow:App).mount(root);}
 catch(error){root.replaceChildren();const message=document.createElement('p');message.textContent='Ouverture interrompue : '+error.message+' Les données du navigateur n’ont pas été supprimées.';const button=document.createElement('button');button.textContent='Réessayer';button.onclick=()=>location.reload();const backup=document.createElement('button');backup.textContent='Télécharger la copie de secours du navigateur';backup.onclick=downloadLocalRecovery;root.append(message,button,backup);}
}
start();
