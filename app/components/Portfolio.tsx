import { ExternalLink } from 'lucide-react'

const growthInsights = [
  {
    title: "Growth in Impressions & New Website Visitors",
    subtitle: "Turning visibility into bookings",
    imageSrc: "/ga4-traffic-graph.png", // placeholder
    imageAlt: "Google Analytics traffic growth",
    context: "We were facing a visibility challenge: search impressions were flat and new visitors weren't converting into bookings.",
    actions: [
      "Rebuilt keyword map and on‑page SEO; optimized service pages and internal links",
      "Tightened Google Ads targeting to local, high‑intent search terms; refreshed ad copy",
      "Streamlined booking path (fewer steps, clearer CTAs)"
    ],
    outcome: "Steady growth in organic impressions and new visitors, with a noticeable jump in first‑time bookings.",
    metrics: [
      { label: "Search impressions", value: "+52%" },
      { label: "New visitors", value: "+38%" },
      { label: "Booking completion rate", value: "+25%" }
    ],
    client: {
      name: "Gardenias Health Care Clinic",
      location: "Milton, ON",
      website: "https://gardenias-healthcare.net"
    },
    credit: "Work delivered with North Via Marketing • Tech by North Via Tech"
  },
  {
    title: "From Clicks to Confirmations (Booking Flow Wins)",
    subtitle: "Reducing friction, raising conversions",
    imageSrc: "/booking-flow.png", // placeholder
    imageAlt: "Before/after booking flow",
    context: "Many visitors reached the booking page but didn't finish—too many fields and unclear steps.",
    actions: [
      "Redesigned the flow to 2–3 clear steps with progress indicators",
      "Added trust cues (policies, therapist credentials) near CTAs",
      "Implemented auto‑confirmations and reminder emails"
    ],
    outcome: "More completed bookings with fewer drop‑offs, especially on mobile.",
    metrics: [
      { label: "Booking completion", value: "+27%" },
      { label: "Mobile drop‑off", value: "−19%" },
      { label: "No‑show rate", value: "−12%" }
    ],
    client: {
    name: "Gardenias Health Care Clinic",
    location: "Milton, ON",
      website: "https://gardenias-healthcare.net"
    },
    credit: "Work delivered with North Via Marketing • Tech by North Via Tech"
  },
  {
    title: "Instagram Engagement That Converts",
    subtitle: "Turning likes into leads",
    imageSrc: "/ig-engagement.png", // placeholder
    imageAlt: "High-performing Instagram post",
    context: "Strong visual content wasn't translating into measurable inquiries.",
    actions: [
      "Introduced 'Save/DM' oriented creatives and captions with clear prompts",
      "Added story highlights for Services, Pricing, and Before/After",
      "Routed DMs to a CRM lead capture with quick‑reply templates"
    ],
    outcome: "More qualified messages and faster hand‑offs into the booking/quote pipeline.",
    metrics: [
      { label: "Saves", value: "+120%" },
      { label: "Profile visits", value: "+85%" },
      { label: "DM‑to‑lead capture", value: "+41%" }
    ],
    client: {
      name: "JL Upholstery",
      location: "ON",
      website: "https://jlupholstery.com"
    },
    credit: "Work delivered with North Via Marketing • Tech by North Via Tech"
  },
  {
    title: "Quoting Made Simple (Custom Tool → Faster Sales)",
    subtitle: "Online fabric selection & quote builder",
    imageSrc: "/quote-tool.png", // placeholder
    imageAlt: "Custom quoting tool interface",
    context: "Quotes took too long; back‑and‑forth on fabrics slowed decisions.",
    actions: [
      "Built a guided fabric selector and quote generator (integrated with CRM)",
      "Added status updates (Submitted → Reviewing → Priced → Scheduled)",
      "Enabled email/SMS notifications at key stages"
    ],
    outcome: "Shorter quote cycles and higher close rates on custom projects.",
    metrics: [
      { label: "Time‑to‑quote", value: "−43%" },
      { label: "Quote‑to‑close", value: "+22%" },
      { label: "Customer satisfaction (CSAT)", value: "4.7/5" }
    ],
    client: {
    name: "JL Upholstery",
      location: "ON",
      website: "https://jlupholstery.com"
    },
    credit: "Work delivered with North Via Marketing • Tech by North Via Tech"
  },
  {
    title: "Local SEO That Brings the Right Calls",
    subtitle: "Google Business Profile optimization",
    imageSrc: "/gbp-performance.png", // placeholder
    imageAlt: "Google Business Profile performance",
    context: "Organic discovery was underperforming for competitive car‑detailing terms.",
    actions: [
      "Reworked services, categories, and descriptions with local keywords",
      "Added new photo sets and seasonal offer posts",
      "Standardized NAP across directories; encouraged fresh reviews"
    ],
    outcome: "Higher local visibility and more high‑intent calls and directions.",
    metrics: [
      { label: "Search views", value: "3×" },
      { label: "Calls from GBP", value: "+48%" },
      { label: "Directions clicks", value: "+36%" }
    ],
    client: {
      name: "Elite Car Shine",
      location: "Oakville, ON",
      website: "https://elitecarshine.ca"
    },
    credit: "Work delivered with North Via Marketing • Tech by North Via Tech"
  },
  {
    title: "Loyalty Offers → Repeat Bookings",
    subtitle: "From one‑time details to repeat plans",
    imageSrc: "/loyalty-plan.png", // placeholder
    imageAlt: "Loyalty plan promotion",
    context: "Lots of first‑time customers, limited repeat cadence.",
    actions: [
      "Designed a simple 3‑tier loyalty plan with reminders",
      "Promoted via email + social + in‑shop QR",
      "Tracked redemption and follow‑up in CRM"
    ],
    outcome: "Stronger monthly recurrence and improved LTV.",
    metrics: [
      { label: "Repeat booking rate", value: "+29%" },
      { label: "Plan enrollments (first 60 days)", value: "+72" },
      { label: "LTV (avg.)", value: "+18%" }
    ],
    client: {
    name: "Elite Car Shine",
    location: "Oakville, ON",
      website: "https://elitecarshine.ca"
    },
    credit: "Work delivered with North Via Marketing • Tech by North Via Tech"
  },
  {
    title: "From Zero to a Credible Brand (Launch Playbook)",
    subtitle: "Brand, site, and social foundation",
    imageSrc: "/brand-launch.png", // placeholder
    imageAlt: "Brand launch collage",
    context: "A new practitioner needed a professional footprint and clear messaging to attract first patients.",
    actions: [
      "Built brand identity, messaging pillars, and a clean site",
      "Created educational post series to build trust",
      "Added online booking with confirmations and reminders"
    ],
    outcome: "Consistent inquiries and an early patient pipeline.",
    metrics: [
      { label: "Site launch to first inquiry", value: "< 2 weeks" },
      { label: "IG follower growth (90 days)", value: "+260%" },
      { label: "Booking adoption", value: "75% online" }
    ],
    client: {
    name: "Dr. Salma – Women Ontario Hub",
    location: "Toronto, ON",
      website: "https://drsalmawomenontariohub.com"
    },
    credit: "Work delivered with North Via Marketing • Tech by North Via Tech"
  }
]

function InsightCard({ item }: { item: any }) {
  return (
    <article className="rounded-2xl bg-white shadow-lg p-6 flex flex-col gap-4 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-[#274290]">{item.title}</h3>
          {item.subtitle && <p className="text-sm text-gray-600 mt-1">{item.subtitle}</p>}
        </div>
        {item.imageSrc && (
          <div className="w-24 h-24 bg-gradient-to-br from-[#274290]/10 to-[#f27921]/10 rounded-lg flex items-center justify-center">
            <div className="text-[#274290] font-bold text-lg">
              {item.title.split(' ').map((word: string) => word[0]).join('').slice(0, 2)}
            </div>
          </div>
        )}
      </div>

      <div className="text-[15px] leading-7 text-gray-800">
        <p><strong>Context:</strong> {item.context}</p>
        <p className="mt-2"><strong>What we did:</strong> {item.actions.join(" · ")}</p>
        <p className="mt-2"><strong>Outcome:</strong> {item.outcome}</p>
      </div>

      {item.metrics?.length ? (
        <ul className="grid grid-cols-2 gap-3 mt-2">
          {item.metrics.map((m: any, i: number) => (
            <li key={i} className="rounded-xl border border-gray-200 p-3 bg-gray-50">
              <div className="text-xs text-gray-500">{m.label}</div>
              <div className="text-lg font-semibold text-[#274290]">{m.value}</div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="pt-3 mt-1 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-gray-500">
          {item.client?.name} • {item.client?.location}
        </div>
        {item.client?.website && (
          <a
            href={item.client.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-[#274290] hover:underline flex items-center gap-1"
          >
            Visit website
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      <div className="text-[11px] text-gray-400">
        {item.client?.credit || "Work by North Via Marketing • Tech by North Via Tech"}
      </div>
    </article>
  )
}

export default function Portfolio() {
  return (
    <section className="py-24 bg-gradient-to-br from-white via-[#e6e7e8]/20 to-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#f27921] rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-[#274290] rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-[#f27921] rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-block bg-gradient-to-r from-[#f27921] to-[#d6681a] text-white px-6 py-2 rounded-full text-sm font-semibold mb-6">
            PROVEN RESULTS
          </div>
          <h2 className="text-5xl lg:text-6xl font-black text-[#274290] leading-tight mb-8">
            Proven Growth for Our Partners
          </h2>
          <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
            We believe results speak louder than promises. Here's how we've helped businesses in different industries grow faster, smarter, and stronger — with measurable outcomes that matter.
          </p>
        </div>

        {/* Insight Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {growthInsights.map((insight, index) => (
            <InsightCard key={index} item={insight} />
          ))}
        </div>
      </div>
    </section>
  )
}
