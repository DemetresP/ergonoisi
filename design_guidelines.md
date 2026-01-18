# ATHENAI.gr Scheduler - Design Guidelines

## Design Approach

**Selected Approach:** Design System-Inspired (Linear + Notion hybrid)

This productivity-focused application requires efficiency and clarity above all else. Drawing inspiration from Linear's clean task management interface and Notion's flexible data display, we'll create a professional tool that balances creative industry aesthetics with functional excellence.

**Core Principles:**
- Clarity over decoration
- Information density without clutter
- Scannable, hierarchical layouts
- Professional, trustworthy interface

---

## Typography

**Font Families:**
- Primary: Inter (via Google Fonts CDN)
- Monospace: JetBrains Mono (for dates, hours, technical data)

**Hierarchy:**
- Page Title (h1): 28px, font-weight 700, letter-spacing -0.02em
- Section Headers (h2): 20px, font-weight 600
- Card Titles (h3): 16px, font-weight 600
- Body Text: 14px, font-weight 400, line-height 1.6
- Small Text (metadata): 12px, font-weight 400
- Table Headers: 12px, font-weight 600, uppercase, letter-spacing 0.05em

---

## Layout System

**Spacing Primitives:** Use Tailwind units of **2, 4, 6, 8, 12, 16**
- Micro spacing (gaps, padding): 2, 4
- Component spacing: 6, 8
- Section spacing: 12, 16
- Page margins: 8, 16

**Container Structure:**
- Max width: 1280px (max-w-7xl)
- Page padding: px-6 md:px-8
- Vertical rhythm: py-6 md:py-8 for sections

---

## Component Library

### Navigation Bar
- Fixed top bar with brand logo left, user profile/auth right
- Height: 64px (h-16)
- Contains: Logo, navigation links (Dashboard, Team, Settings), user avatar dropdown
- Subtle border bottom for separation

### Task Creation Form (Card)
- Elevated card with rounded corners (rounded-lg)
- Padding: p-6
- Grid layout: 2 columns on desktop (grid-cols-1 md:grid-cols-2), with full-width project title
- Input groups with labels above inputs
- Primary action button (Add Task) aligned to bottom-right

### Task Table
- Full-width data table with fixed header on scroll
- Columns: Project Title, Shoot Date, Delivery Date, Assignee, Est. Hours, Status, Actions
- Row hover states for interactivity
- Compact row height: py-3
- Sortable column headers (with sort icons from Heroicons)
- Status displayed as pill/badge components
- Action buttons (edit, delete) as icon buttons using Heroicons (pencil, trash)

### Status Badges
- Small pill shape with rounded-full
- Padding: px-3 py-1
- Font: 12px, font-weight 500
- States: Todo, In Progress, Done, Overdue

### Workload Overview Cards
- Grid layout: grid-cols-1 md:grid-cols-3
- Each person gets a card showing: Name, Task count, Total hours, Overdue count
- Metric display: Large number (text-2xl, font-bold) with small label below
- Overdue alerts prominently displayed with alert icon (Heroicons exclamation-triangle)

### Date Pickers
- Native HTML date inputs styled consistently
- Monospace font for date display
- Icon prefix (Heroicons calendar)

### Export/Import Section
- Utility buttons grouped together
- Secondary button style (outlined, not filled)
- Icons: download (export), upload (import) from Heroicons

### Alerts/Notifications
- Toast-style notifications for actions (task created, imported, etc.)
- Position: top-right of viewport
- Auto-dismiss after 3 seconds
- Icons for success/error states

### Empty States
- Centered layout with illustration placeholder comment: `<!-- CUSTOM ICON: Video production illustration -->`
- Heading + descriptive text + primary CTA button
- Shown when no tasks exist

---

## Interactions & Animations

**Minimal, Purposeful Motion:**
- Hover states: Subtle scale (scale-105) on buttons only
- Focus states: Ring outline on all interactive elements
- Table row hover: Background tint transition (duration-150)
- Modal/dropdown entry: Fade + slide (duration-200)
- NO scroll animations, parallax, or decorative effects

---

## Responsive Behavior

**Breakpoints:**
- Mobile: Default (< 768px) - single column layouts, stacked cards
- Tablet: md (768px+) - 2-column grids where appropriate
- Desktop: lg (1024px+) - full multi-column table views

**Mobile Adaptations:**
- Task table becomes card-based list on mobile
- Hide less critical columns (shoot date) on small screens
- Full-width form inputs
- Sticky header with hamburger menu

---

## Accessibility

- WCAG AA contrast ratios throughout
- Keyboard navigation for all interactive elements
- Focus indicators on all form inputs, buttons, and links
- ARIA labels for icon-only buttons
- Screen reader text for status changes and alerts
- Semantic HTML structure (header, nav, main, section)

---

## Data Visualization

**Task Priority Indicators:**
- Vertical accent bar on left edge of task rows for visual priority
- Width: 4px, height: full row height
- Position based on delivery date proximity

**Workload Bar Charts:**
- Simple horizontal bar showing capacity (e.g., hours per person vs. available hours)
- Height: 8px (h-2), rounded ends
- Segment within container showing utilization

---

## Icons

**Library:** Heroicons (outline style)

**Usage:**
- Navigation: home, users, cog (settings)
- Actions: plus, pencil, trash, download, upload
- Status: check-circle, clock, exclamation-triangle
- Dates: calendar
- Size: 20px (w-5 h-5) for inline, 24px (w-6 h-6) for standalone

---

## Form Elements

- Input height: h-10
- Consistent border-radius: rounded-md
- Focus ring on all inputs
- Label always above input with spacing (mb-2)
- Required field indicators (asterisk)
- Inline validation messages below inputs

---

## Special Considerations

**Video Production Context:**
- Date prominence: Shoot and delivery dates are critical - use monospace font and calendar icons
- Visual hierarchy emphasizes deadlines over other metadata
- Quick-scan design for fast production environments
- Professional aesthetic suitable for client-facing use