import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import {videoEncoderPlugin} from './scripts/video-encoder-plugin.mjs';
export default defineConfig({plugins:[vue(),videoEncoderPlugin()]});
