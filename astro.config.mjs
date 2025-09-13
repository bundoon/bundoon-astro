import { defineConfig } from 'astro/config';
import remarkGfm from 'remark-gfm';

export default defineConfig({
  markdown: { remarkPlugins: [remarkGfm] },
});
