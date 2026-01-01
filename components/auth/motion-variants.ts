import { Variants } from 'framer-motion'

/**
 * Page container variant with stagger children
 */
export const pageContainerVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

/**
 * Item variant that enters with y offset + opacity
 */
export const itemVariants: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1], // easeOut
    },
  },
}

/**
 * Sparkle/accent animation variant
 */
export const sparkleVariants: Variants = {
  animate: {
    rotate: [0, 180, 360],
    scale: [1, 1.1, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

/**
 * Scale on hover variant
 */
export const hoverScaleVariants = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
}

/**
 * Slide in from left with stagger
 */
export const staggerSlideLeftVariants: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  }),
}

/**
 * Spring animation for card header
 */
export const springScaleVariants: Variants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
}

