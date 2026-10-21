import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import {assetLibraryPlugin} from './scripts/asset-library-plugin.mjs';
import {videoEncoderPlugin} from './scripts/video-encoder-plugin.mjs';
export default defineConfig({plugins:[vue(),videoEncoderPlugin(),assetLibraryPlugin()],build:{rollupOptions:{output:{manualChunks:id=>id.includes("/node_modules/")?"vendor":undefined}}}});
