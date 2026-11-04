import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react';
export default defineConfig({ base:'/ar-locals-scan/', plugins:[react()], envPrefix:['VITE_','SUPABASE_','DESK_'] });
