import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    /*
      vite-plugin-pwa עושה בשבילנו שני דברים:

      1. Web App Manifest — "תעודת הזהות" של האפליקציה:
         שם, אייקונים, צבעים. זה מה שמאפשר "הוסף למסך הבית"
         ופתיחה בחלון משלה בלי שורת כתובת.

      2. Service Worker — סקריפט שיושב בין האפליקציה לרשת,
         שומר עותק של כל הקבצים (precache) ומגיש אותם
         כשאין אינטרנט. ככה KeepIt עובד גם אופליין —
         הנתונים ממילא ב-IndexedDB על המכשיר.
    */
    VitePWA({
      registerType: 'autoUpdate', // גרסה חדשה נטענת אוטומטית ברענון הבא
      manifest: {
        name: 'KeepIt — השוברים שלי',
        short_name: 'KeepIt',
        description: 'ניהול שוברים, גיפט קארדים וקופונים — הכול על המכשיר שלך',
        dir: 'rtl',
        lang: 'he',
        display: 'standalone',      // בלי שורת כתובת — מרגיש כמו אפליקציה
        theme_color: '#12332e',     // צבע שורת המערכת
        background_color: '#eef2ee',// צבע מסך הפתיחה
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          // maskable: אנדרואיד חותך את האייקון לצורות שונות (עיגול/משובע)
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // אילו קבצים נשמרים מראש לעבודה אופליין
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        // ספריית הסריקה גדולה מברירת המחדל של 2MB — מעלים את התקרה
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
})
