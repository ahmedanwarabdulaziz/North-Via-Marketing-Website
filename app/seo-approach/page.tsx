import { ArrowRight, Shield, Zap, Search, FileText, Settings, TrendingUp } from 'lucide-react';
import Image from 'next/image';

const seoStandards = [
  {
    icon: Shield,
    title: "Technical SEO Foundation",
    image: "/s1.png",
    what: "We fix the structure, speed, and health of your site so search engines can crawl it efficiently and users enjoy fast, smooth experiences.",
    why: "Technical excellence ensures search engines can find and understand your site.",
    how: "Site audits, speed optimization, mobile-first indexing."
  },
  {
    icon: Search,
    title: "Content Strategy & Optimization",
    image: "/s2.png",
    what: "We research, plan, and craft content that speaks your audience's language—helping you rank higher while converting visitors into leads.",
    why: "Provides value to users while ranking for relevant terms.",
    how: "Keyword research, content planning, on-page optimization."
  },
  {
    icon: FileText,
    title: "Local & Niche Visibility",
    image: "/s3.png",
    what: "We strengthen how your business appears in relevant searches—whether it's city-based or industry-specific—so your audience finds you first.",
    why: "Drives local customers to your business.",
    how: "GMB optimization, local citations, review management."
  },
  {
    icon: TrendingUp,
    title: "Authority & Link Building",
    image: "/s4.png",
    what: "We build credible backlinks and partnerships that signal trust to search engines and position your site as a reliable industry voice.",
    why: "Signals trust and relevance to search engines.",
    how: "Strategic outreach, content marketing, relationship building."
  },
  {
    icon: Zap,
    title: "User Experience Optimization",
    image: "/s5.png",
    what: "We enhance usability, mobile flow, and conversion paths so visitors stay longer and take action.",
    why: "Better UX leads to higher rankings and conversions.",
    how: "UX audits, conversion optimization, mobile optimization."
  },
  {
    icon: Settings,
    title: "Analytics & Performance Tracking",
    image: "/s6.png",
    what: "Every SEO effort is measurable. We track key metrics, share plain-language reports, and adjust strategy based on real data.",
    why: "Data-driven optimization and ROI measurement.",
    how: "Google Analytics setup, regular reporting, performance analysis."
  }
];

const optimizationPhases = [
  {
    phase: "Phase 1 – Foundation",
    title: "Months 1-3",
    description: "Audit, fix, and align your website's structure, speed, and content. Establish measurement tools."
  },
  {
    phase: "Phase 2 – Growth",
    title: "Months 4-6",
    description: "Expand optimized content, strengthen backlinks, and start measurable ranking improvements."
  },
  {
    phase: "Phase 3 – Scale",
    title: "Month 7+",
    description: "Deepen authority, refine user experience, and use analytics to drive compound growth."
  }
];

export default function SEOApproach() {
  return (
    <div className="min-h-screen">
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-white via-[#e6e7e8]/20 to-white overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/Hero-03.png"
            alt="SEO Approach Background"
            fill
            className="object-cover"
            priority
          />
          {/* Gradient Overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/80 via-[#274290]/60 to-[#f27921]/80"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl lg:text-6xl xl:text-7xl font-black text-white leading-tight mb-8">
              <span className="block">SEO That Works for</span>
              <span className="block text-[#f27921]">Real Businesses</span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-6">
              We combine technical precision with strategy and analytics to bring consistent traffic, stronger visibility, and measurable growth.
            </p>
            
            <p className="text-lg text-white/80 leading-relaxed mb-8">
              Because ranking means nothing if it doesn't grow your business.
            </p>

            <a 
              href="#contact" 
              className="inline-flex items-center gap-2 bg-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#d6681a] transition-all duration-300 group shadow-lg hover:shadow-xl"
            >
              Let's Build Your SEO Strategy
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </a>
          </div>
          
          {/* Right Column - Empty for balance */}
          <div className="hidden lg:block"></div>
        </div>
      </section>

      {/* SEO Standards Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header with Banner */}
            <div className="relative mb-16">
              <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/x005.png"
                  alt="Our Six Non-Negotiables for SEO Excellence Banner"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                      Our Six Non-Negotiables for SEO Excellence
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                      Six proven pillars that form the foundation of every successful SEO campaign we deliver.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-6xl mx-auto">
              {seoStandards.map((standard, index) => {
                const IconComponent = standard.icon
                return (
                  <div key={index} className="bg-white rounded-2xl shadow-xl overflow-hidden mb-12 border border-gray-100">
                    <div className="p-8">
                      <div className="flex items-start gap-8">
                        {/* Left Column - Image and Number */}
                        <div className="flex-shrink-0">
                          <div className="relative">
                            {/* Image */}
                            <div className="relative w-64 h-48 rounded-xl overflow-hidden shadow-lg">
                              <Image
                                src={standard.image}
                                alt={standard.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                            
                            {/* Number Badge */}
                            <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-white font-black text-xl">{index + 1}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Column - Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-lg flex items-center justify-center">
                              <IconComponent className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-[#274290]">{standard.title}</h3>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h4 className="font-bold text-[#274290] mb-2">What We Do:</h4>
                              <p className="text-gray-700 leading-relaxed">{standard.what}</p>
                            </div>
                            
                            <div>
                              <h4 className="font-bold text-[#274290] mb-2">Why It Matters:</h4>
                              <p className="text-gray-700 leading-relaxed">{standard.why}</p>
                            </div>
                            
                            <div>
                              <h4 className="font-bold text-[#274290] mb-2">How We Do It:</h4>
                              <p className="text-gray-700 leading-relaxed">{standard.how}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Optimization Process Section */}
      <section className="py-24 bg-[#e6e7e8]">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header with Banner */}
            <div className="relative mb-16">
              <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/x001.png"
                  alt="Gradual, Ongoing Optimization Banner"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                      Gradual, Ongoing Optimization
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                      SEO is a continuous process, not a one-time task. At North Via Marketing, we work in phases to ensure steady, sustainable growth.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {optimizationPhases.map((phase, index) => (
                  <div key={index} className="bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-white font-black text-2xl">{index + 1}</span>
                    </div>
                    
                    <div className="text-sm font-semibold text-[#f27921] mb-2">
                      {phase.phase}
                    </div>
                    
                    <h3 className="text-xl font-black text-[#274290] mb-4">
                      {phase.title}
                    </h3>
                    
                    <p className="text-gray-700 leading-relaxed">
                      {phase.description}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="text-center mt-12">
                <p className="text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto mb-4">
                  This step-by-step method means your SEO improves steadily — even if your site isn't 100% optimized from day one.
                </p>
                <p className="text-xl font-bold text-[#274290]">
                  SEO isn't a one-time project—it's a managed system of continuous improvement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promise Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-2xl p-12 text-white">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-8">
                <TrendingUp className="text-white" size={40} />
              </div>
              
              <h2 className="text-3xl lg:text-4xl font-black mb-8">
                Our Promise
              </h2>
              
              <p className="text-xl leading-relaxed">
                We operate as your SEO partner, not a vendor. You'll always know what we're doing, why it matters, and what impact it's having. Every action is documented, measurable, and aligned with your growth goals.
              </p>
              
              <div className="mt-12">
                <a 
                  href="/contact" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-[#274290] px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-lg hover:shadow-xl mx-auto w-fit"
                >
                  Schedule a Strategy Call
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results & Testimonials Section */}
      <section className="py-24 bg-[#e6e7e8]">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Visual Data Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
                <div className="text-4xl font-black text-[#f27921] mb-2">+300%</div>
                <div className="text-lg font-semibold text-[#274290]">Average CTR Increase</div>
              </div>
              <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
                <div className="text-4xl font-black text-[#f27921] mb-2">+150</div>
                <div className="text-lg font-semibold text-[#274290]">Keywords Ranking</div>
              </div>
              <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
                <div className="text-4xl font-black text-[#f27921] mb-2">+400%</div>
                <div className="text-lg font-semibold text-[#274290]">Organic Traffic Growth</div>
              </div>
            </div>

            {/* Case Snippet */}
            <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-2xl p-8 text-white text-center mb-16">
              <h3 className="text-2xl font-bold mb-4">Real Results</h3>
              <p className="text-lg leading-relaxed max-w-3xl mx-auto">
                "We helped a local service business increase their website sessions by 300% in just 90 days through targeted SEO optimization and content strategy."
              </p>
            </div>

            {/* Micro Testimonial */}
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <blockquote className="text-xl font-semibold text-gray-800 mb-6 italic">
                "They helped us dominate local search in under 6 months."
              </blockquote>
              <cite className="text-[#274290] font-semibold">— Local Business Owner</cite>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}