import { defineConfig } from 'vite';
// Browser QA profiles contain locked files and are not application source.
export default defineConfig({
  base: '/ai-bot-house-3d/',
  server: { watch: { ignored: ['**/qa/**'] } },
});
