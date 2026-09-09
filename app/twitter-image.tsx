import { ImageResponse } from 'next/og'
import { EstateIQSocialCard } from '@/components/brand/social-card'

export const alt = 'EstateIQ rent operations and portfolio intelligence platform'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function TwitterImage() {
  return new ImageResponse(<EstateIQSocialCard />, size)
}
