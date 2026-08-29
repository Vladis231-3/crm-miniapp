import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // Pre-bundle ALL dependencies in one pass instead of discovering them lazily.
  // Removes the cold-start delay (first request to /src/main.tsx) and the
  // "new dependencies optimized, reloading" hiccup when a dep is first imported.
  optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled',
      '@mui/icons-material',
      '@mui/material',
      '@popperjs/core',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-aspect-ratio',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-tooltip',
      'canvas-confetti',
      'class-variance-authority',
      'clsx',
      'cmdk',
      'date-fns',
      'embla-carousel-react',
      'input-otp',
      'lucide-react',
      'motion',
      'next-themes',
      'react-day-picker',
      'react-dnd',
      'react-dnd-html5-backend',
      'react-hook-form',
      'react-popper',
      'react-resizable-panels',
      'react-responsive-masonry',
      'react-router',
      'react-slick',
      'recharts',
      'sonner',
      'tailwind-merge',
      'tw-animate-css',
      'vaul',
    ],
  },

  // Pre-transform the app entry (and the heaviest screens) while the server
  // is starting up, so the browser doesn't wait for the first request to
  // compile the module graph. OwnerApp/AdminApp are >250KB each and take
  // seconds through Babel on cold transforms.
  server: {
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/styles/index.css',
        './src/app/context/AppContext.tsx',
        './src/app/components/owner/OwnerApp.tsx',
        './src/app/components/admin/AdminApp.tsx',
        './src/app/components/worker/WorkerApp.tsx',
        './src/app/components/client/ClientApp.tsx',
      ],
    },
  },

  // Форсируем ASCII-экранирование кириллицы в бандле (\\u0412\\u043b...) чтобы
  // Telegram WebView на Android, игнорирующий charset, не декодировал UTF-8 как windows-1251
  esbuild: {
    charset: 'ascii',
  },
})
