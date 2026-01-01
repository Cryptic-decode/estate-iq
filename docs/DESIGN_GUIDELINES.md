# EstateIQ Design Guidelines

Comprehensive design system and component patterns for EstateIQ. Includes landing page blueprint, premium authentication UI patterns, and reusable component guidelines.

---

## Table of Contents

1. [SaaS Landing Page Blueprint](#saas-landing-page-blueprint)
2. [Premium Authentication UI](#premium-authentication-ui)
3. [Component Patterns](#component-patterns)

---

# SaaS Landing Page Design Blueprint

A reusable, modern SaaS landing page blueprint that can be applied to any product. Framework-agnostic, theme-aware, and built for accessibility.

---

## A) Blueprint Overview

### High-Level Principles

1. **Single-Page Layout**: All sections flow vertically in one continuous page
2. **Theme-Aware**: Works seamlessly in light/dark/system modes using semantic tokens
3. **Component-Based**: Reuse primitives (Button, Card, Input, Section, Container) for consistency
4. **Subtle Motion**: Short durations, easeOut curves, staggered lists—never distracting
5. **Accessibility First**: Keyboard navigable, visible focus states, sufficient contrast, tap targets ≥44px
6. **Responsive by Default**: Mobile-first approach with clear breakpoints
7. **Content-Driven**: Sections adapt to data models (features, steps, testimonials, FAQs)

### Core Constraints

- Framework-agnostic (assumes component-based UI + utility CSS available)
- Theme-aware using semantic tokens (background/foreground/card/muted/border/primary/destructive)
- Clean + DRY: reuse primitives, avoid duplication
- Motion is subtle and consistent (easeOut, short durations, stagger lists)
- Use "focus-visible" patterns for keyboard accessibility
- Data models for repeatable sections (features, steps, testimonials, FAQs, logos)
- Default breakpoints: mobile <640px, tablet 640–1024px, desktop ≥1024px

---

## B) Section Sequence

**Canonical order** (use unless product needs exceptions):

1. **Sticky Header** (brand + nav + theme toggle + primary CTA)
2. **Hero** (value prop + proof + primary/secondary CTA)
3. **Interactive Proof** (choose ONE: product demo block OR stats row OR "how it works" preview)
4. **Feature Grid** (capabilities)
5. **How It Works** (process)
6. **Social Proof** (logos/testimonials/metrics)
7. **Pricing or Plan Teaser** (optional but recommended for B2B)
8. **FAQ** (objection handling)
9. **Final CTA** (conversion endcap)
10. **Footer** (utility nav + legal)

---

## C) Section Blueprint Details

### 1) Sticky Header

**Purpose**: Always-available navigation + trust anchor + conversion point.

**Components**:
- `Brand` (mark + name)
- `DesktopNav` (3–6 links)
- `MobileNav` (hamburger menu)
- `ThemeToggle` (light/dark/system)
- `PrimaryCTAButton` ("Sign in" or "Get started")

**Content Blocks**:
- Brand mark + name (left-aligned)
- 3–6 navigation links (center or right)
- "Sign in" / "Get started" CTA (right)
- Theme toggle (near nav)

**Layout Rules**:
- **Desktop**: Brand left; nav center/right; primary CTA right; theme toggle near nav
- **Mobile**: Brand left; theme toggle + hamburger right; hide desktop links
- **Scroll Behavior**: Transparent at top; on scroll add blur + border + subtle shadow

**Interaction Rules**:
- Active link state (underline or color change)
- Smooth scroll for on-page anchors (using Framer Motion)
- External links open in new tab (`rel="noopener noreferrer"`)
- CTA hover: lift + shadow
- Mobile menu: slide-in from right/left, overlay backdrop

**Common Variations**:
- Multi-product dropdown
- Language selector
- Announcement bar above header
- Sticky CTA that appears on scroll

---

### 2) Hero (Primary Value Prop)

**Purpose**: Explain what it is + who it's for + why it's better; drive first CTA.

**Components**:
- `Eyebrow` / `Pill` (3–6 words + subtle icon/dot)
- `H1` (2-line max; second line can be gradient/emphasis)
- Supporting paragraph (1–2 sentences; include one quantified claim if credible)
- `CTA Group` (Primary filled + Secondary outline/link; optional tertiary text link)
- Trust bullets (2–4 short bullets: "No credit card", "Free trial", "Cancel anytime")
- Optional hero visual (image/cards/screenshot)

**Content Structure**:
```
Eyebrow: "Rent Intelligence Platform"
H1: "Know the state of your rent. Always."
Subcopy: "EstateIQ ensures rent obligations are never forgotten..."
CTAs: [Primary: "Get started"] [Secondary: "Sign in"]
Trust: • No credit card • Free trial • Cancel anytime
```

**Layout Rules**:
- **Desktop**: 60/40 split (copy left, visual right) OR centered hero; max-width ~6–7xl
- **Tablet**: Stack visual under copy OR maintain 2-col with reduced gaps
- **Mobile**: Single column; CTAs stack vertically; tap targets ≥44px height

**Interaction Rules**:
- Primary CTA: hover lift + shadow; active press feedback
- Secondary CTA: border/color shift on hover
- Hero visual: subtle parallax or fade-in on scroll (optional)

**Common Variations**:
- Split hero (copy left, visual right)
- Centered hero (copy centered, visual below)
- Hero with screenshot (product preview)
- Hero with "cards" stack (feature highlights)

---

### 3) Interactive Proof (Choose One)

**Pick ONE primary proof mechanism immediately after hero:**

**A) "Try it now" Demo Block** (embedded calculator/configurator)
- Purpose: Reduce skepticism via interaction
- Components: Section header + two-column block (copy + interactive widget)
- Layout: Desktop 2-column; mobile stack (interactive below explanation)
- Interaction: Inputs use standard focus-visible ring; results animate in (subtle)

**B) Stats Ticker** (3–4 KPIs)
- Purpose: Quantified evidence
- Components: Horizontal stats row with icons/numbers
- Layout: Desktop row; mobile stack or wrap
- Interaction: Optional count-up animation on scroll

**C) Mini "How It Works"** (3 steps)
- Purpose: Quick process preview
- Components: 3 step cards (icon, title, description)
- Layout: Desktop 3 columns; mobile 1 column
- Interaction: Hover elevation; optional scroll-triggered reveal

**Common Variations**:
- Video modal (play button overlay)
- Interactive widget (calculator, configurator)
- Comparison slider (before/after)

---

### 4) Feature Grid

**Purpose**: Explain capabilities; convert abstract value into concrete features.

**Components**:
- Section header (`Pill` + `H2` + subcopy)
- `FeatureCard` list (icon, title, description, optional category)

**Data Model**:
```typescript
features[] = {
  icon: string | ReactNode,
  title: string,
  description: string,
  category?: string,
  emphasisColor?: string
}
```

**Layout Rules**:
- **Desktop**: 3 columns, 6 items typical
- **Tablet**: 2 columns
- **Mobile**: 1 column

**Interaction Rules**:
- Card hover: slight elevation + border accent
- Icons can scale/rotate subtly on hover
- Optional: click to expand details

**Common Variations**:
- Feature rows (image left, text right)
- Grouped features (by category)
- Tabbed features (filter by category)

---

### 5) How It Works (Process)

**Purpose**: Make adoption feel easy; show the path from signup to outcome.

**Components**:
- `StepCard` list (step number, icon, title, description)

**Data Model**:
```typescript
steps[] = {
  number: number,
  title: string,
  description: string,
  icon: string | ReactNode,
  color?: string
}
```

**Layout Rules**:
- **Desktop**: 4 columns (4 steps) or 3 columns (3 steps)
- **Tablet**: 2 columns
- **Mobile**: 1 column; maintain equal spacing

**Interaction Rules**:
- Hover elevation
- Optional scroll-triggered reveal (staggered)

**Common Variations**:
- Timeline (vertical line connecting steps)
- Numbered list with illustration
- Accordion steps (expandable details)

---

### 6) Social Proof

**Purpose**: Build trust (logos + testimonials + outcomes).

**Components**:
- `LogosRow` (company logos)
- `Testimonials` (carousel or grid)
- Optional metric chips

**Data Models**:
```typescript
logos[] = {
  name: string,
  src: string,
  href?: string
}

testimonials[] = {
  quote: string,
  name: string,
  role: string,
  company: string,
  rating?: number,
  avatar?: string
}
```

**Layout Rules**:
- **Logos**: Wrap; keep consistent logo height (e.g., 32px)
- **Testimonials**: 1–3 cards visible depending on viewport; mobile prefer single card + dots

**Interaction Rules**:
- Subtle auto-advance (optional, pause on hover)
- Manual navigation always available (arrows + dots)
- Smooth transitions between cards

**Common Variations**:
- Case study cards (detailed stories)
- Press mentions (quotes from publications)
- Review badges (aggregate ratings)

---

### 7) Pricing / Plan Teaser (Optional)

**Purpose**: Set expectations; remove pricing anxiety.

**Components**:
- `PricingCard` list (plan name, price, features, CTA)

**Data Model**:
```typescript
plans[] = {
  name: string,
  price: number | string,
  period: string,
  highlight?: string,
  features: string[],
  cta: string,
  popular?: boolean
}
```

**Layout Rules**:
- **Desktop**: 3 cards; "popular" can be visually elevated (border/shadow/badge)
- **Mobile**: Stack; ensure CTAs remain visible

**Interaction Rules**:
- Hover elevation
- CTA consistent with primary/secondary patterns
- Optional: toggle annual/monthly pricing

**Common Variations**:
- "Contact sales" card (enterprise)
- Usage-based slider (custom pricing)
- Comparison table (feature matrix)

---

### 8) FAQ (Objection Handling)

**Purpose**: Address top objections and reduce support burden.

**Components**:
- `Accordion` list

**Data Model**:
```typescript
faqs[] = {
  question: string,
  answer: string
}
```

**Layout Rules**:
- One column
- Max width ~3–4xl for readability

**Interaction Rules**:
- Accordion open/close with short animation (e.g., 200ms easeOut)
- Preserve focus-visible states
- Keyboard navigable (arrow keys, Enter/Space to toggle)

**Common Variations**:
- Grouped FAQs (by category)
- Searchable FAQs
- Expand all / collapse all toggle

---

### 9) Final CTA (Endcap)

**Purpose**: Second conversion moment after full context.

**Components**:
- `H3` (headline)
- Subcopy
- CTA pair (primary + secondary)
- Proof bullets (optional)

**Layout Rules**:
- **Desktop**: Centered; CTAs inline
- **Mobile**: CTAs stacked
- Background: Subtle gradient panel + soft blobs; never overpower text

**Interaction Rules**:
- Same CTA rules as hero (consistency is key)
- Optional: scroll-triggered fade-in

**Common Variations**:
- Split CTA (two different actions)
- Single CTA (stronger focus)
- CTA with form (email capture)

---

### 10) Footer

**Purpose**: Utility navigation, credibility, compliance.

**Components**:
- Brand (mark + name)
- Small nav columns (Product, Company, Resources, Legal)
- Social links (icons)
- Legal (copyright, privacy, terms)

**Layout Rules**:
- **Desktop**: Columns (4–5 columns typical)
- **Mobile**: Stacked; accordion for nav sections (optional)

**Interaction Rules**:
- Link hover: underline
- Focus-visible rings for icon links
- External links: `rel="noopener noreferrer"`

**Common Variations**:
- Newsletter signup in footer
- Country/language selector
- Status page link

---

## D) System Rules

### Theming

Use semantic tokens (avoid hardcoded light-only colors):

- `bg-background` (main background)
- `text-foreground` (main text)
- `bg-card` (card background)
- `text-muted-foreground` (supporting text)
- `border-border` (borders)
- `ring-ring` (focus rings)
- `bg-primary` / `text-primary` (primary actions)
- `bg-destructive` / `text-destructive` (errors/destructive actions)

**Theme-aware checklist**:
- Every section readable in light/dark/system
- No hardcoded "white on white" or "black on black"
- Test all color combinations in both themes

### Typography

- **Fonts**: 1–2 fonts max (sans-serif primary, optional mono for code)
- **H1**: 48–72px desktop, 32–48px mobile
- **H2**: 36–48px desktop, 28–36px mobile
- **H3**: 24–32px desktop, 20–24px mobile
- **Body**: 16–18px desktop, 16px mobile
- **Muted text**: 14px, reduced opacity/contrast
- **Line height**: 1.5–1.75 for body, 1.2–1.4 for headings

### Spacing

- **Vertical rhythm**: Consistent spacing between sections
- **Section padding**: 64–96px desktop, 48–64px mobile
- **Component spacing**: 16px, 24px, 32px, 48px scale
- **Container max-width**: ~7xl (1280px) for content, ~6xl (1152px) for text

### Radii

- **Default**: 12px (buttons, cards, inputs)
- **Large panels**: 24px
- **Small elements**: 6px (badges, pills)
- **Consistent**: Use same radius scale throughout

### Shadows

- **Subtle elevation**: `0 1px 2px rgba(0,0,0,0.05)`
- **Card hover**: `0 4px 12px rgba(0,0,0,0.1)`
- **Modal/overlay**: `0 20px 25px rgba(0,0,0,0.15)`
- **Theme-aware**: Adjust opacity for dark mode

### Buttons

**Primary Button**:
- Filled background, strong contrast
- Hover: lift + shadow, slight scale (1.02)
- Active: press feedback (scale 0.98)
- Focus-visible: ring + ring offset
- Height: ≥44px (accessibility)

**Secondary Button**:
- Outline border, transparent background
- Hover: border/color shift, subtle background fill
- Same height as primary
- Focus-visible: ring + ring offset

**Tertiary Button** (text link):
- No border, text color
- Hover: underline or color change
- Focus-visible: underline + ring

### Links

- **Default**: Primary color, underline on hover
- **External**: `rel="noopener noreferrer"`, optional icon
- **Focus-visible**: Ring + ring offset
- **Active state**: Visited color (subtle)

### Icon Usage

- **Size**: 16px, 20px, 24px scale
- **Color**: Inherit text color or use semantic tokens
- **Spacing**: 8px gap between icon and text
- **Accessibility**: Decorative icons hidden from screen readers; informative icons have `aria-label`

### Motion

- **Duration**: 150–300ms (short, purposeful)
- **Easing**: `easeOut` (cubic-bezier(0.4, 0, 0.2, 1))
- **Stagger lists**: 50–100ms delay between items
- **Avoid**: Loops, distracting animations, motion for motion's sake
- **Respect prefers-reduced-motion**: Disable animations if user prefers

### Accessibility

- **Keyboard navigable**: All interactive elements reachable via Tab
- **Visible focus**: `focus-visible` rings on all buttons/links/inputs
- **Contrast**: WCAG AA minimum (4.5:1 for text, 3:1 for UI components)
- **Tap targets**: ≥44px height/width
- **Screen readers**: Semantic HTML, ARIA labels where needed
- **External links**: `rel="noopener noreferrer"`

---

## E) Implementation Checklist

### Before Shipping

- [ ] **Theme**: Every section readable in light/dark/system; no hardcoded colors
- [ ] **Responsive**: Verify stacking for each section at mobile/tablet/desktop breakpoints
- [ ] **CTAs**: Consistent copy and styling across hero + final CTA
- [ ] **Focus-visible**: Every button/link/input has focus state; no mouse-only focus rings
- [ ] **Performance**: Optimize images (WebP, lazy loading); avoid heavy animations; no layout shift
- [ ] **Content**: H1 and CTA are clear; features/steps are scannable; FAQ answers concise
- [ ] **Accessibility**: Keyboard navigation works; screen reader tested; contrast verified
- [ ] **Motion**: Respects `prefers-reduced-motion`; animations are subtle and purposeful
- [ ] **Links**: External links have `rel="noopener noreferrer"`; internal links work
- [ ] **Forms**: Validation messages clear; error states visible; submit feedback provided

---

## F) One-Page Skeleton

```html
<Page>
  <StickyHeader>
    <Brand />
    <DesktopNav />
    <ThemeToggle />
    <PrimaryCTA />
    <MobileNav />
  </StickyHeader>

  <Hero>
    <Eyebrow />
    <H1 />
    <Subcopy />
    <CTAGroup />
    <TrustBullets />
    <HeroVisual />
  </Hero>

  <InteractiveProof>
    <!-- Choose ONE: Demo / Stats / Mini How It Works -->
  </InteractiveProof>

  <FeatureGrid>
    <SectionHeader />
    <FeatureCard[] />
  </FeatureGrid>

  <HowItWorks>
    <SectionHeader />
    <StepCard[] />
  </HowItWorks>

  <SocialProof>
    <LogosRow />
    <Testimonials />
    <Metrics />
  </SocialProof>

  <Pricing>
    <SectionHeader />
    <PricingCard[] />
  </Pricing>

  <FAQ>
    <SectionHeader />
    <Accordion[] />
  </FAQ>

  <FinalCTA>
    <H3 />
    <Subcopy />
    <CTAGroup />
    <ProofBullets />
  </FinalCTA>

  <Footer>
    <Brand />
    <NavColumns />
    <SocialLinks />
    <Legal />
  </Footer>
</Page>
```

---

## G) Example JSON Data Models

### Features

```json
{
  "features": [
    {
      "icon": "⚡",
      "title": "Lightning Fast",
      "description": "Process thousands of records in seconds with our optimized engine.",
      "category": "Performance"
    },
    {
      "icon": "🔒",
      "title": "Enterprise Security",
      "description": "SOC 2 compliant with end-to-end encryption and audit logs.",
      "category": "Security"
    },
    {
      "icon": "📊",
      "title": "Real-Time Analytics",
      "description": "Track performance metrics with live dashboards and custom reports.",
      "category": "Analytics"
    }
  ]
}
```

### Steps (How It Works)

```json
{
  "steps": [
    {
      "number": 1,
      "title": "Sign Up",
      "description": "Create your account in 30 seconds. No credit card required.",
      "icon": "✏️",
      "color": "blue"
    },
    {
      "number": 2,
      "title": "Connect Your Data",
      "description": "Import your existing data or start fresh with our templates.",
      "icon": "🔗",
      "color": "green"
    },
    {
      "number": 3,
      "title": "Automate Workflows",
      "description": "Set up rules and watch your processes run automatically.",
      "icon": "⚙️",
      "color": "purple"
    },
    {
      "number": 4,
      "title": "See Results",
      "description": "Monitor performance and optimize with real-time insights.",
      "icon": "📈",
      "color": "orange"
    }
  ]
}
```

### Testimonials

```json
{
  "testimonials": [
    {
      "quote": "This product saved us 20 hours per week. The automation is incredible.",
      "name": "Sarah Chen",
      "role": "Operations Manager",
      "company": "TechCorp",
      "rating": 5,
      "avatar": "/avatars/sarah.jpg"
    },
    {
      "quote": "Best investment we made this year. ROI was immediate.",
      "name": "Michael Rodriguez",
      "role": "CEO",
      "company": "StartupXYZ",
      "rating": 5,
      "avatar": "/avatars/michael.jpg"
    }
  ]
}
```

### Logos

```json
{
  "logos": [
    {
      "name": "TechCorp",
      "src": "/logos/techcorp.svg",
      "href": "https://example.com/case-studies/techcorp"
    },
    {
      "name": "StartupXYZ",
      "src": "/logos/startupxyz.svg",
      "href": "https://example.com/case-studies/startupxyz"
    },
    {
      "name": "GlobalInc",
      "src": "/logos/globalinc.svg"
    }
  ]
}
```

### Plans (Pricing)

```json
{
  "plans": [
    {
      "name": "Starter",
      "price": 29,
      "period": "month",
      "features": [
        "Up to 5 users",
        "10GB storage",
        "Email support",
        "Basic analytics"
      ],
      "cta": "Start free trial",
      "popular": false
    },
    {
      "name": "Professional",
      "price": 99,
      "period": "month",
      "highlight": "Most popular",
      "features": [
        "Up to 25 users",
        "100GB storage",
        "Priority support",
        "Advanced analytics",
        "API access"
      ],
      "cta": "Start free trial",
      "popular": true
    },
    {
      "name": "Enterprise",
      "price": "Custom",
      "period": "",
      "features": [
        "Unlimited users",
        "Unlimited storage",
        "Dedicated support",
        "Custom integrations",
        "SLA guarantee"
      ],
      "cta": "Contact sales",
      "popular": false
    }
  ]
}
```

### FAQs

```json
{
  "faqs": [
    {
      "question": "How long does setup take?",
      "answer": "Most teams are up and running in under 10 minutes. Our onboarding wizard guides you through each step."
    },
    {
      "question": "Can I cancel anytime?",
      "answer": "Yes, you can cancel your subscription at any time. No long-term contracts or cancellation fees."
    },
    {
      "question": "Do you offer refunds?",
      "answer": "We offer a 30-day money-back guarantee. If you're not satisfied, contact us for a full refund."
    },
    {
      "question": "Is my data secure?",
      "answer": "Absolutely. We're SOC 2 Type II certified and use end-to-end encryption. Your data is never shared with third parties."
    }
  ]
}
```

---

# Premium Authentication UI

A premium, conversion-focused authentication UI system inspired by QuickLand-style SaaS auth screens. Built with Next.js App Router, Tailwind CSS, Framer Motion, and next-themes.

---

## A) Architecture Overview

### Component Structure

```
components/auth/
├── auth-layout.tsx          # Full-screen container with gradient backgrounds
├── auth-header.tsx          # Brand logo, theme toggle, nav CTA
├── auth-container.tsx       # Responsive layout (mobile stack, desktop 2-col)
├── auth-hero.tsx            # Hero section with gradient text
├── auth-card.tsx            # Glass-morphism card component
├── animated-auth-form.tsx   # Shared form component (signin/signup)
├── password-input.tsx        # Password input with visibility toggle
├── auth-button.tsx          # Animated gradient CTA button
├── auth-error-panel.tsx     # Error display with spring animation
├── auth-secondary-action.tsx # Secondary action links
└── motion-variants.ts       # Reusable Framer Motion variants
```

### Key Principles

1. **Full-Screen Layout**: min-h-screen with gradient backgrounds
2. **Glass-Morphism**: Backdrop blur + semi-transparent backgrounds
3. **Responsive Design**: Mobile vertical stack, desktop two-column grid
4. **Smooth Animations**: Framer Motion with staggered children
5. **Theme-Aware**: Full light/dark mode support
6. **Accessibility**: Keyboard navigation, focus states, ARIA labels

---

## B) Layout System

### AuthLayout

**Purpose**: Full-screen container with gradient backgrounds and motion system.

**Features**:
- Multi-stop gradient backgrounds (light/dark mode)
- Subtle radial gradient overlays for depth
- Page container variants with stagger children
- Relative z-index for content layering

**Usage**:
```tsx
<AuthLayout>
  {/* Auth page content */}
</AuthLayout>
```

### AuthContainer

**Purpose**: Responsive layout system for hero and form sections.

**Layout Rules**:
- **Mobile (< lg)**: Vertical stack with `space-y-8`
- **Desktop (≥ lg)**: Two-column grid (`lg:grid lg:grid-cols-2`)
  - Left: Hero + Features (stacked)
  - Right: Form card (centered, max-width `md`)
- Gap: `gap-12` on desktop
- Vertical alignment: `items-center` on desktop

**Usage**:
```tsx
<AuthContainer
  hero={<AuthHero authType="signin" />}
  form={<AuthCard>...</AuthCard>}
  features={optional}
/>
```

---

## C) Component Patterns

### AuthHeader

**Purpose**: Top navigation with brand, theme toggle, and nav CTA.

**Components**:
- Brand logo (clickable, links to `/`)
- Theme toggle button (Sun/Moon icons)
- Nav CTA (switches between "Sign In" / "Create Account")

**Features**:
- Hover scale animations on interactive elements
- Glass-morphism styling for nav CTA
- Smooth theme transitions

**Props**:
```typescript
interface AuthHeaderProps {
  authType: 'signin' | 'signup'
  brandName?: string
  brandHref?: string
}
```

### AuthHero

**Purpose**: Hero section with headline and supporting text.

**Features**:
- Dynamic headlines based on auth type
- Gradient text for brand name
- Responsive typography (text-4xl → text-6xl)
- Fade-in animation on mount

**Content**:
- Sign In: "Welcome back to **EstateIQ**"
- Sign Up: "Create rent intelligence in minutes with **EstateIQ**"

### AuthCard

**Purpose**: Glass-morphism card container for form.

**Styling**:
- Light mode: `bg-white/80` with `backdrop-blur-sm`
- Dark mode: `bg-zinc-800/80` with `backdrop-blur-sm`
- Shadow: `shadow-2xl`
- Border: `border-0` (no border)
- Rounded: `rounded-2xl`

**Features**:
- Animated header with spring scale effect
- Centered title and description
- Flexible content area for form

### AnimatedAuthForm

**Purpose**: Shared form component supporting both signin and signup modes.

**Form Structure**:
- Error panel (conditional, animated)
- Signup-only: Full Name + Company (2-column grid)
- Email input
- Password input (with visibility toggle)
- Submit button (animated gradient CTA)
- Secondary action link

**Props**:
```typescript
interface AnimatedAuthFormProps {
  type: 'signin' | 'signup'
  email: string
  setEmail: (email: string) => void
  password: string
  setPassword: (password: string) => void
  fullName?: string
  setFullName?: (name: string) => void
  companyName?: string
  setCompanyName?: (name: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  loading: boolean
  error?: string | null
}
```

### PasswordInput

**Purpose**: Password input with show/hide toggle.

**Features**:
- Eye/EyeOff icons from lucide-react
- Toggle button inside input (right side)
- Hover/tap scale animations
- Proper accessibility (aria-label, tabIndex)
- Error state styling
- Helper text support

### AuthButton

**Purpose**: Animated gradient CTA button.

**Features**:
- Gradient overlay slides in on hover (left to right)
- ArrowRight icon shifts on hover
- Loading spinner state
- Full-width with consistent height
- Variant support (signin/signup)

**Animations**:
- Hover: scale 1.02, gradient overlay fades in
- Tap: scale 0.98
- Loading: spinner rotates continuously

### AuthErrorPanel

**Purpose**: Error display with spring animation.

**Features**:
- Spring animation (scale + opacity)
- Red-tinted panel with border
- AlertCircle icon
- Light/dark mode support
- Conditional rendering (returns null if no error)

### AuthSecondaryAction

**Purpose**: Secondary action link with microcopy.

**Features**:
- Dynamic text based on auth type
- Hover/tap scale animations
- Link styling with hover underline
- Configurable hrefs

---

## D) Motion System

### Framer Motion Variants

Located in `components/auth/motion-variants.ts`:

**pageContainerVariants**:
- Stagger children with delay
- Used for page-level animations

**itemVariants**:
- Y offset + opacity fade-in
- Duration: 0.6s, easeOut
- Used for section/item animations

**sparkleVariants**:
- Rotate + scale loop animation
- Duration: 2s, infinite repeat
- (Note: Sparkle removed from AuthHero for cleaner design)

**hoverScaleVariants**:
- Hover: scale 1.05
- Tap: scale 0.95
- Used for interactive elements

**staggerSlideLeftVariants**:
- Slide in from left with stagger
- Custom delay based on index
- Used for lists/features

**springScaleVariants**:
- Spring animation for card headers
- Stiffness: 200, damping: 20
- Used for mount animations

---

## E) Theming

### Theme Provider Setup

**Location**: `components/theme-provider.tsx`

**Configuration**:
- Uses `next-themes`
- Attribute: `class`
- Default: `system`
- Enable system preference detection

**Root Layout**:
```tsx
<html lang="en" suppressHydrationWarning>
  <body>
    <ThemeProvider>{children}</ThemeProvider>
  </body>
</html>
```

### Color Tokens

**Light Mode**:
- Background: `bg-white`, `bg-zinc-50`
- Text: `text-zinc-900`, `text-zinc-600`
- Borders: `border-zinc-200`, `border-zinc-300`
- Cards: `bg-white/80` with backdrop blur

**Dark Mode**:
- Background: `dark:bg-zinc-900`, `dark:bg-zinc-950`
- Text: `dark:text-zinc-50`, `dark:text-zinc-300`
- Borders: `dark:border-zinc-800`, `dark:border-zinc-700`
- Cards: `dark:bg-zinc-800/80` with backdrop blur

---

## F) Implementation Checklist

### Premium Auth UI

- [ ] **Layout**: Full-screen gradient backgrounds render correctly
- [ ] **Responsive**: Mobile stacks vertically, desktop shows two-column grid
- [ ] **Theme**: Light/dark mode works, theme toggle functions
- [ ] **Animations**: Page fade-in, form animations, button hover effects
- [ ] **Form**: All inputs render, password toggle works, validation displays
- [ ] **Error Handling**: Error panel animates in, displays correctly
- [ ] **Navigation**: Header links work, smooth scroll functions
- [ ] **Accessibility**: Keyboard navigation, focus states, ARIA labels
- [ ] **Performance**: No layout shift, animations are smooth
- [ ] **Cross-browser**: Tested in Chrome, Firefox, Safari

---

## G) Usage Examples

### Sign In Page

```tsx
'use client'

import { useState } from 'react'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthContainer } from '@/components/auth/auth-container'
import { AuthHero } from '@/components/auth/auth-hero'
import { AuthCard } from '@/components/auth/auth-card'
import { AnimatedAuthForm } from '@/components/auth/animated-auth-form'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    // Auth logic here
  }

  return (
    <AuthLayout>
      <AuthHeader authType="signin" />
      <AuthContainer
        hero={<AuthHero authType="signin" />}
        form={
          <AuthCard
            title="Welcome Back"
            description="Sign in to continue managing your rent intelligence"
          >
            <AnimatedAuthForm
              type="signin"
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              onSubmit={handleSignIn}
              loading={loading}
              error={error}
            />
          </AuthCard>
        }
      />
    </AuthLayout>
  )
}
```

### Sign Up Page

```tsx
// Similar structure, with signup-specific props:
<AnimatedAuthForm
  type="signup"
  email={email}
  setEmail={setEmail}
  password={password}
  setPassword={setPassword}
  fullName={fullName}
  setFullName={setFullName}
  onSubmit={handleSignup}
  loading={loading}
  error={error}
/>
```

---

## Summary

This design system provides:

1. **Landing Page Blueprint**: Complete section-by-section guide for SaaS landing pages
2. **Premium Auth UI**: QuickLand-inspired authentication screens with glass-morphism
3. **Component Patterns**: Reusable, accessible, theme-aware components
4. **Motion System**: Subtle, purposeful animations with Framer Motion
5. **Implementation Guidelines**: Checklists and examples for consistent implementation

Apply these patterns consistently across EstateIQ for a cohesive, premium user experience.
