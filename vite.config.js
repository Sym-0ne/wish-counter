import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// IMPORTANT : remplace '/genshin-wish-tracker/' par le nom de ton dépôt GitHub
// Exemple : si ton repo est https://github.com/user/my-tracker
//          alors base: '/my-tracker/'
export default defineConfig({
  plugins: [react()],
  base: '/genshin-wish-tracker/',
});
