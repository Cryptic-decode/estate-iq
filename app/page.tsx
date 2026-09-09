'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { animate, motion, useReducedMotion } from 'framer-motion'
import {
  ChevronDown,
  Moon,
  Sun,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { EstateIQLogo } from '@/components/brand/estate-iq-logo'
import { useThemeControl } from '@/components/ui/use-theme-control'

const navigation = [
  { label: 'Product', id: 'product' },
  { label: 'Workflow', id: 'workflow' },
  { label: 'Reporting', id: 'reporting' },
  { label: 'FAQ', id: 'faq' },
]

const capabilities = [
  {
    title: 'Portfolio records',
    description: 'Keep buildings, units, tenants, and occupancies connected in one organization workspace.',
  },
  {
    title: 'Rent operations',
    description: 'Configure obligations, generate periods, record payments, and keep every rent status understandable.',
  },
  {
    title: 'Focused follow-ups',
    description: 'Prioritize due and overdue rent, prepare reminder drafts, and move through the queue deliberately.',
  },
  {
    title: 'Leadership reporting',
    description: 'Review collection rate, delinquency aging, building rollups, and sensitive account activity.',
  },
]

const workflow = [
  { title: 'Set up the portfolio', description: 'Enter records individually or begin with the provided spreadsheet templates.' },
  { title: 'Define rent', description: 'Connect occupancies to rent amounts, cycles, and due dates.' },
  { title: 'Run collections', description: 'Use the daily brief and follow-up queue to focus the team.' },
  { title: 'Review performance', description: 'Understand outcomes across time, buildings, and operational activity.' },
]

const reports = [
  { title: 'Collection rate', description: 'Compare rent collected with rent due across a selected period.' },
  { title: 'Delinquency aging', description: 'See outstanding rent grouped by how long it has been overdue.' },
  { title: 'Building rollups', description: 'Locate unpaid exposure and overdue risk across the portfolio.' },
  { title: 'Audit trail', description: 'Review sensitive changes and maintain operational accountability.' },
]

const faqs = [
  {
    question: 'Who is EstateIQ for?',
    answer: 'EstateIQ is designed for real estate companies and the teams responsible for portfolio setup, rent tracking, collections, and reporting.',
  },
  {
    question: 'Can we import existing portfolio records?',
    answer: 'Yes. Buildings, units, and tenant records can be entered individually or uploaded in bulk using downloadable spreadsheet templates.',
  },
  {
    question: 'Does EstateIQ send reminders automatically?',
    answer: 'EstateIQ can send tracked email reminders when email delivery is configured for the workspace. Teams still review and confirm each send. SMS delivery remains planned.',
  },
  {
    question: 'How is organization data separated?',
    answer: 'Each workspace is organization-scoped, with membership-based access and row-level security enforcing data isolation.',
  },
]

const reveal = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
}

function ThemeToggle() {
  const { themeLabel, themePressed, toggleTheme } = useThemeControl()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#123a32]/15 text-[#123a32] transition-colors hover:border-[#123a32]/35 hover:bg-[#123a32]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b48a4a] dark:border-[#f4f1e8]/20 dark:text-[#f4f1e8] dark:hover:bg-white/5"
      aria-label={themeLabel}
      aria-pressed={themePressed}
    >
      <Sun className="absolute h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  )
}

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const scrollAnimation = useRef<ReturnType<typeof animate> | null>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(Boolean(user))
    }

    void checkAuth()
  }, [])

  useEffect(() => {
    const sections = ['hero', ...navigation.map(({ id }) => id)]
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section))
    let animationFrame: number | null = null

    const updateActiveSection = () => {
      const marker = window.scrollY + window.innerHeight * 0.3
      let currentSection = 'hero'

      sections.forEach((section) => {
        if (section.offsetTop <= marker) currentSection = section.id
      })

      setActiveSection(currentSection === 'hero' ? '' : currentSection)
      animationFrame = null
    }

    const scheduleUpdate = () => {
      if (animationFrame !== null) return
      animationFrame = window.requestAnimationFrame(updateActiveSection)
    }

    updateActiveSection()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [])

  const primaryHref = isAuthenticated ? '/app' : '/signup'
  const primaryLabel = isAuthenticated ? 'Open dashboard' : 'Create your workspace'

  const scrollToSection = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const section = document.getElementById(id)
    if (!section) return

    event.preventDefault()
    setActiveSection(id === 'hero' ? '' : id)
    const destination = section.getBoundingClientRect().top + window.scrollY - 72

    if (reduceMotion) {
      window.scrollTo({ top: destination })
    } else {
      scrollAnimation.current?.stop()
      scrollAnimation.current = animate(window.scrollY, destination, {
        duration: 0.75,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (value) => window.scrollTo(0, value),
      })
    }

    window.history.replaceState(null, '', `#${id}`)
  }

  return (
    <div className="min-h-screen bg-[#f4f1e8] text-[#14201b] transition-colors duration-300 dark:bg-[#0c1613] dark:text-[#f4f1e8]">
      <header className="sticky top-0 z-50 border-b border-[#123a32]/10 bg-[#f4f1e8]/92 backdrop-blur-xl dark:border-[#f4f1e8]/10 dark:bg-[#0c1613]/92">
        <div className="mx-auto flex h-[4.5rem] max-w-[90rem] items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link
            href="#hero"
            onClick={(event) => scrollToSection(event, 'hero')}
            aria-label="Return to the top of the EstateIQ page"
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b48a4a]"
          >
            <EstateIQLogo />
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => (
              <Link
                key={item.id}
                href={`#${item.id}`}
                onClick={(event) => scrollToSection(event, item.id)}
                aria-current={activeSection === item.id ? 'location' : undefined}
                className={`relative px-4 py-2 text-sm font-medium transition-colors after:absolute after:inset-x-4 after:bottom-0 after:h-px after:origin-left after:bg-[#b48a4a] after:transition-transform ${
                  activeSection === item.id
                    ? 'text-[#123a32] after:scale-x-100 dark:text-[#f4f1e8]'
                    : 'text-[#526059] after:scale-x-0 hover:text-[#123a32] hover:after:scale-x-100 dark:text-[#a9b4ae] dark:hover:text-[#f4f1e8]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {!isAuthenticated && (
              <Link href="/signin" className="hidden px-3 py-2 text-sm font-medium text-[#405049] transition-colors hover:text-[#123a32] dark:text-[#b8c1bd] dark:hover:text-white sm:inline-flex">
                Sign in
              </Link>
            )}
            <Link href={primaryHref} className="inline-flex min-h-10 items-center justify-center bg-[#123a32] px-4 text-sm font-semibold text-[#f7f3e9] transition-colors hover:bg-[#1a4b41] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b48a4a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4f1e8] dark:bg-[#f4f1e8] dark:text-[#123a32] dark:hover:bg-white dark:focus-visible:ring-offset-[#0c1613]">
              {isAuthenticated ? 'Dashboard' : 'Get started'}
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="outline-none">
        <section id="hero" className="scroll-mt-[4.5rem] mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-[90rem] items-stretch overflow-hidden lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div
            initial={reduceMotion ? false : 'hidden'}
            animate="visible"
            variants={reveal}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="flex flex-col justify-center px-4 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-24"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6a35] dark:text-[#c89c56]">Rent operations, clearly managed</p>
            <h1 className="font-estate-serif mt-7 max-w-2xl text-[clamp(3.35rem,5.2vw,5.4rem)] leading-[0.94] tracking-[-0.045em] text-[#123a32] dark:text-[#f4f1e8]">
              See the whole portfolio. <em className="font-normal text-[#8f6b31] dark:text-[#c59a57]">Act</em> on what matters.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#526059] dark:text-[#b7c1bc] sm:text-lg sm:leading-8">
              EstateIQ gives property teams one dependable workspace for portfolio records, rent obligations, payments, follow-ups, and reporting.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={primaryHref} className="inline-flex min-h-12 items-center justify-center gap-3 bg-[#123a32] px-6 text-sm font-semibold text-[#f7f3e9] transition-colors hover:bg-[#1a4b41] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b48a4a] focus-visible:ring-offset-2 dark:bg-[#f4f1e8] dark:text-[#123a32] dark:hover:bg-white dark:focus-visible:ring-offset-[#0c1613]">
                {primaryLabel}
              </Link>
              <Link href="#product" onClick={(event) => scrollToSection(event, 'product')} className="inline-flex min-h-12 items-center justify-center border border-[#123a32]/25 px-6 text-sm font-semibold text-[#123a32] transition-colors hover:border-[#123a32] hover:bg-[#123a32]/5 dark:border-[#f4f1e8]/25 dark:text-[#f4f1e8] dark:hover:border-[#f4f1e8] dark:hover:bg-white/5">
                Explore the platform
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-[#66736c] dark:text-[#95a39c] sm:text-sm">
              {['Organization-scoped', 'Role-aware', 'Bulk import ready'].map((item, index) => (
                <span key={item} className="inline-flex items-center gap-3">
                  {index > 0 && <span className="h-1 w-1 rounded-full bg-[#b48a4a]" aria-hidden="true" />}
                  {item}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: 'easeOut' }}
            className="relative min-h-[30rem] overflow-hidden lg:min-h-0"
          >
            <Image src="/images/estateiq/hero-residences.jpg" alt="Contemporary multi-unit residential property in warm morning light" fill loading="eager" sizes="(min-width: 1024px) 57vw, 100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c1613]/25 via-transparent to-transparent dark:bg-[#07110e]/25" aria-hidden="true" />
            <div className="absolute bottom-6 right-6 border-l border-[#f4f1e8]/70 pl-4 text-right text-xs uppercase tracking-[0.18em] text-[#f4f1e8] drop-shadow-sm">
              Portfolio clarity<br />from one workspace
            </div>
          </motion.div>
        </section>

        <section id="product" className="scroll-mt-20 border-t border-[#123a32]/10 py-24 dark:border-[#f4f1e8]/10 sm:py-32">
          <div className="mx-auto grid max-w-[90rem] gap-14 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start lg:gap-20 lg:px-10">
            <motion.div initial={reduceMotion ? false : 'hidden'} whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal} transition={{ duration: 0.5 }} className="lg:sticky lg:top-28">
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image src="/images/estateiq/portfolio-detail.jpg" alt="Architectural detail of a well-maintained residential building" fill sizes="(min-width: 1024px) 38vw, 100vw" className="object-cover" />
                <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10" aria-hidden="true" />
              </div>
            </motion.div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6a35] dark:text-[#c89c56]">The operating picture</p>
              <h2 className="font-estate-serif mt-5 max-w-3xl text-5xl leading-[0.98] tracking-[-0.035em] text-[#123a32] dark:text-[#f4f1e8] sm:text-6xl lg:text-7xl">
                Finally connected.
              </h2>
              <div className="mt-12 border-t border-[#123a32]/20 dark:border-[#f4f1e8]/15">
                {capabilities.map((item, index) => (
                  <motion.article key={item.title} initial={reduceMotion ? false : 'hidden'} whileInView="visible" viewport={{ once: true, amount: 0.4 }} variants={reveal} transition={{ duration: 0.45, delay: index * 0.05 }} className="grid gap-4 border-b border-[#123a32]/20 py-7 dark:border-[#f4f1e8]/15 sm:grid-cols-[3rem_1fr_1.15fr] sm:items-start sm:gap-6">
                    <span className="font-estate-serif text-2xl text-[#8f6b31] dark:text-[#c59a57]">0{index + 1}</span>
                    <h3 className="font-estate-serif text-2xl leading-tight text-[#123a32] dark:text-[#f4f1e8]">{item.title}</h3>
                    <p className="text-sm leading-6 text-[#59665f] dark:text-[#aeb9b3]">{item.description}</p>
                  </motion.article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-20 bg-[#123a32] py-24 text-[#f4f1e8] dark:bg-[#102a24] sm:py-32">
          <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d0a35b]">A deliberate workflow</p>
              <h2 className="font-estate-serif mt-5 text-5xl leading-[0.98] tracking-[-0.035em] sm:text-6xl lg:text-7xl">A calm sequence for busy rent teams.</h2>
            </div>
            <ol className="mt-14 grid border-y border-[#f4f1e8]/20 sm:grid-cols-2 lg:grid-cols-4">
              {workflow.map((step, index) => (
                <li key={step.title} className="border-b border-[#f4f1e8]/20 py-7 sm:px-6 sm:odd:border-r lg:border-b-0 lg:border-r lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0">
                  <span className="font-estate-serif text-4xl text-[#d0a35b]">0{index + 1}</span>
                  <h3 className="mt-7 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#c5d0cb]">{step.description}</p>
                </li>
              ))}
            </ol>
            <motion.div initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6 }} className="relative mt-12 aspect-[4/3] w-full overflow-hidden sm:aspect-[16/7]">
              <Image src="/images/estateiq/workflow-courtyard.jpg" alt="Landscaped pathway through a residential property portfolio" fill sizes="100vw" className="object-cover" />
              <div className="absolute inset-0 bg-[#0c1613]/15 ring-1 ring-inset ring-white/10" aria-hidden="true" />
            </motion.div>
          </div>
        </section>

        <section id="reporting" className="scroll-mt-20 py-24 sm:py-32">
          <div className="mx-auto grid max-w-[90rem] gap-14 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24 lg:px-10">
            <motion.div initial={reduceMotion ? false : 'hidden'} whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={reveal} transition={{ duration: 0.5 }}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6a35] dark:text-[#c89c56]">Reporting</p>
              <h2 className="font-estate-serif mt-6 text-5xl leading-[0.98] tracking-[-0.035em] text-[#123a32] dark:text-[#f4f1e8] sm:text-6xl lg:text-7xl">
                Turn rent activity into a <em className="font-normal text-[#8f6b31] dark:text-[#c59a57]">clearer</em> decision.
              </h2>
              <p className="mt-7 max-w-lg text-base leading-7 text-[#59665f] dark:text-[#aeb9b3]">See collection performance, locate outstanding risk, and retain a clear history of sensitive changes.</p>
            </motion.div>
            <div className="border-t border-[#123a32]/20 dark:border-[#f4f1e8]/15">
              {reports.map((report, index) => (
                <div key={report.title} className="grid gap-4 border-b border-[#123a32]/20 py-6 dark:border-[#f4f1e8]/15 sm:grid-cols-[3rem_0.8fr_1.2fr] sm:items-center sm:gap-6">
                  <span className="font-estate-serif text-xl text-[#8f6b31] dark:text-[#c59a57]">0{index + 1}</span>
                  <h3 className="font-estate-serif text-2xl text-[#123a32] dark:text-[#f4f1e8]">{report.title}</h3>
                  <p className="text-sm leading-6 text-[#59665f] dark:text-[#aeb9b3]">{report.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 border-t border-[#123a32]/10 py-24 dark:border-[#f4f1e8]/10 sm:py-32">
          <div className="mx-auto grid max-w-[90rem] gap-12 px-4 sm:px-6 lg:grid-cols-[0.65fr_1.35fr] lg:gap-24 lg:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6a35] dark:text-[#c89c56]">Common questions</p>
              <h2 className="font-estate-serif mt-5 max-w-md text-5xl leading-[0.98] tracking-[-0.035em] text-[#123a32] dark:text-[#f4f1e8] sm:text-6xl">Clear answers.</h2>
            </div>
            <div className="border-t border-[#123a32]/20 dark:border-[#f4f1e8]/15">
              {faqs.map((faq) => (
                <details key={faq.question} className="group border-b border-[#123a32]/20 dark:border-[#f4f1e8]/15">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-base font-semibold text-[#123a32] marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b48a4a] dark:text-[#f4f1e8]">
                    {faq.question}
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <p className="max-w-2xl pb-6 pr-10 text-sm leading-7 text-[#59665f] dark:text-[#aeb9b3]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative isolate overflow-hidden bg-[#08110e] py-24 text-[#f4f1e8] sm:py-32">
          <Image src="/images/estateiq/hero-residences.jpg" alt="" fill sizes="100vw" className="-z-20 object-cover opacity-25" aria-hidden="true" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#08110e] via-[#08110e]/95 to-[#08110e]/55" aria-hidden="true" />
          <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d0a35b]">A clearer operating view</p>
            <h2 className="font-estate-serif mt-5 max-w-4xl text-5xl leading-[0.96] tracking-[-0.035em] sm:text-6xl lg:text-8xl">Run rent operations with confidence.</h2>
            <Link href={primaryHref} className="mt-10 inline-flex min-h-13 items-center justify-center gap-3 bg-[#f4f1e8] px-7 text-sm font-semibold text-[#123a32] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0a35b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08110e]">
              {primaryLabel}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#123a32]/10 bg-[#f4f1e8] dark:border-[#f4f1e8]/10 dark:bg-[#0c1613]">
        <div className="mx-auto flex max-w-[90rem] flex-col gap-5 px-4 py-8 text-sm text-[#66736c] dark:text-[#95a39c] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <Link
            href="#hero"
            onClick={(event) => scrollToSection(event, 'hero')}
            aria-label="Return to the top of the EstateIQ page"
          >
            <EstateIQLogo />
          </Link>
          <p>Portfolio intelligence for practical rent operations.</p>
          <p>&copy; {new Date().getFullYear()} EstateIQ</p>
        </div>
      </footer>
    </div>
  )
}
