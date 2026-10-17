import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import {applicationConfig} from './scripts/application-config.mjs';
import {localDataPlugin} from './scripts/local-data-plugin.mjs';
export default defineConfig(()=>({plugins:[vue(),localDataPlugin(applicationConfig())]}));
