import type { MetadataRoute } from 'next'
import { SITE_DESCRIPTION, SITE_TITLE } from '@/lib/site'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: 'EstateIQ',
    description: SITE_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f1e8',
    theme_color: '#123a32',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
