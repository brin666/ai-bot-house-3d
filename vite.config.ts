import { defineConfig } from 'vite';
// Browser QA profiles contain locked files and are not application source.
export default defineConfig({server:{watch:{ignored:['**/qa/**']}}});
