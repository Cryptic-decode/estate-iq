'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { itemVariants, pageContainerVariants } from '@/components/auth/motion-variants'

export default function HomePage() {
  const { resolvedTheme, setTheme } = useTheme()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }
    checkAuth()
  }, [])

  // Smooth scroll handler
  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  return (
    <motion.div
      variants={pageContainerVariants}
      initial="initial"
      animate="animate"
      className="flex min-h-screen flex-col bg-white dark:bg-zinc-900"
    >
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link
            href="#hero"
            onClick={(e) => handleSmoothScroll(e, '#hero')}
            className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            EstateIQ
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            <Link
              href="#features"
              onClick={(e) => handleSmoothScroll(e, '#features')}
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              onClick={(e) => handleSmoothScroll(e, '#how-it-works')}
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              How It Works
            </Link>
            <Link
              href="#faq"
              onClick={(e) => handleSmoothScroll(e, '#faq')}
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            {mounted && (
              <button
                type="button"
                onClick={() => {
                  const current = resolvedTheme || 'light'
                  setTheme(current === 'dark' ? 'light' : 'dark')
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                aria-label="Toggle theme"
              >
                <Sun className="pointer-events-none absolute h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="pointer-events-none absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </button>
            )}
            {isAuthenticated ? (
              <Link
                href="/app"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/signin"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="hero" className="mx-auto w-full max-w-7xl px-4 py-24 md:py-32">
        <motion.div variants={itemVariants} className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-1.5 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            Rent Intelligence Platform
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl md:text-6xl">
            Know the state of your rent.{' '}
            <span className="text-zinc-600 dark:text-zinc-400">Always.</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-300 sm:text-xl">
            EstateIQ ensures rent obligations are never forgotten, follow-ups are
            consistent, and management always has clear visibility into rent status.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {isAuthenticated ? (
              <Link
                href="/app"
                className="w-full rounded-md bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100 sm:w-auto"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="w-full rounded-md bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-100 sm:w-auto"
                >
                  Get started
                </Link>
                <Link
                  href="/signin"
                  className="w-full rounded-md border border-zinc-300 bg-white px-6 py-3 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700 sm:w-auto"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="flex items-center gap-2">
              <span className="text-green-500">✓</span> No credit card required
            </span>
            <span className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Free trial
            </span>
            <span className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Cancel anytime
            </span>
          </div>
        </motion.div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="border-t border-zinc-200 bg-zinc-50 py-24 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div variants={itemVariants} className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
              Everything you need for rent intelligence
            </h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-300">
              Track, remind, and manage rent payments with confidence
            </p>
          </motion.div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2 lg:max-w-none lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                custom={index}
                className="rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-900 dark:shadow-zinc-900/50"
              >
                <div className="text-2xl">{feature.icon}</div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t border-zinc-200 bg-white py-24 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div variants={itemVariants} className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-300">
              Get started in minutes, see results immediately
            </p>
          </motion.div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2 lg:max-w-none lg:grid-cols-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                variants={itemVariants}
                custom={index}
                className="relative"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="border-t border-zinc-200 bg-zinc-50 py-16 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-3 lg:max-w-none">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                custom={index}
                className="text-center"
              >
                <div className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-zinc-200 bg-white py-24 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-4">
          <motion.div variants={itemVariants} className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-300">
              Everything you need to know about EstateIQ
            </p>
          </motion.div>
          <div className="mt-16 space-y-8">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.question}
                variants={itemVariants}
                custom={index}
                className="border-b border-zinc-200 pb-8 dark:border-zinc-800"
              >
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {faq.question}
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {faq.answer}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-zinc-200 bg-zinc-900 py-24 dark:border-zinc-950">
        <motion.div variants={itemVariants} className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-zinc-300">
            Join real estate companies managing rent with confidence
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {isAuthenticated ? (
              <Link
                href="/app"
                className="w-full rounded-md bg-white px-6 py-3 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-900 sm:w-auto"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="w-full rounded-md bg-white px-6 py-3 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-900 sm:w-auto"
                >
                  Get started
                </Link>
                <Link
                  href="/signin"
                  className="w-full rounded-md border border-zinc-700 bg-transparent px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-900 sm:w-auto"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-4">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                EstateIQ
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Know the state of your rent. Always.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Product
              </h4>
              <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>
                  <Link
                    href="#features"
                    onClick={(e) => handleSmoothScroll(e, '#features')}
                    className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#how-it-works"
                    onClick={(e) => handleSmoothScroll(e, '#how-it-works')}
                    className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50"
                  >
                    How It Works
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Company
              </h4>
              <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>
                  <Link
                    href="#faq"
                    onClick={(e) => handleSmoothScroll(e, '#faq')}
                    className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50"
                  >
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Legal
              </h4>
              <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>
                  <Link href="#" className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-zinc-200 pt-8 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            <p>&copy; {new Date().getFullYear()} EstateIQ. All rights reserved.</p>
          </div>
    </div>
      </footer>
    </motion.div>
  )
}

// Data models
const features = [
  {
    icon: '📊',
    title: 'Rent Status Tracking',
    description:
      'Track due, paid, and overdue rent with automatic status updates and day-overdue calculations.',
  },
  {
    icon: '🔔',
    title: 'Intelligent Reminders',
    description:
      'AI-generated reminder drafts with tone adjustment based on payment history and escalation rules.',
  },
  {
    icon: '📈',
    title: 'Daily Rent Brief',
    description:
      'Auto-generated daily summary of rents due today, overdue rents, and high-risk tenants.',
  },
  {
    icon: '🏢',
    title: 'Multi-Building Management',
    description:
      'Manage multiple buildings, units, and tenants all in one centralized platform.',
  },
  {
    icon: '👥',
    title: 'Team Collaboration',
    description:
      'Role-based access (Owner, Manager, Ops, Director) for secure team collaboration.',
  },
  {
    icon: '📋',
    title: 'Rent Reports',
    description:
      'Monthly summaries, overdue lists, and payment history reports for better insights.',
  },
]

const steps = [
  {
    title: 'Sign Up',
    description: 'Create your account and set up your company organization.',
  },
  {
    title: 'Add Buildings & Units',
    description: 'Import or manually add your buildings, units, and tenants.',
  },
  {
    title: 'Configure Rent',
    description: 'Set rent amounts, cycles, and due dates for each tenant.',
  },
  {
    title: 'Track & Remind',
    description: 'Monitor rent status and send intelligent reminders automatically.',
  },
]

const stats = [
  {
    value: '100%',
    label: 'Rent Visibility',
  },
  {
    value: '24/7',
    label: 'Automated Tracking',
  },
  {
    value: 'Zero',
    label: 'Missed Follow-ups',
  },
]

const faqs = [
  {
    question: 'How does EstateIQ track rent payments?',
    answer:
      'EstateIQ automatically generates rent periods based on your configuration. You manually confirm payments, and the system tracks status (Due, Paid, Overdue) with automatic day-overdue calculations.',
  },
  {
    question: 'Can I customize reminder messages?',
    answer:
      'Yes! EstateIQ generates AI-powered reminder drafts that you can review and customize before sending. The tone adjusts based on payment history and overdue duration.',
  },
  {
    question: 'What happens if a tenant is overdue?',
    answer:
      'EstateIQ automatically calculates days overdue and triggers escalation reminders. The daily brief highlights overdue rents and high-risk tenants for immediate attention.',
  },
  {
    question: 'Can multiple team members access the same organization?',
    answer:
      'Yes! EstateIQ supports role-based access. Owners can manage everything, Managers and Ops can handle day-to-day operations, and Directors have read-only access to dashboards and reports.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Absolutely. EstateIQ uses Row Level Security (RLS) to ensure complete data isolation between organizations. Your data is encrypted and never shared across companies.',
  },
]
