import {createApp} from 'vue';
import App from './App.vue';
import './style.css';
import AudienceWindow from './components/AudienceWindow.vue';
createApp(new URLSearchParams(location.search).has('frameAudience')?AudienceWindow:App).mount('#app');
