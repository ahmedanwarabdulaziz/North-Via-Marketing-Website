import { ArrowRight, Shield, Zap, Search, FileText, Settings, TrendingUp, BarChart3, Target, Users, Globe, CheckCircle } from 'lucide-react';
import Image from 'next/image';

const seoStandards = [
  {
    icon: Shield,
    title: "Audit & Research",
    image: "/s1.png",
    what: "We analyze your site structure, competitors, and keyword opportunities to create a comprehensive baseline and strategic roadmap.",
    why: "Understanding your current position and competitive landscape is essential for effective SEO strategy.",
    how: "Technical audits, competitor analysis, keyword research, market opportunity assessment."
  },
  {
    icon: Zap,
    title: "Technical Optimization",
    image: "/s2.png",
    what: "We optimize site speed, mobile performance, indexing, and on-page structure to ensure search engines can crawl and rank your content effectively.",
    why: "Technical excellence forms the foundation that allows all other SEO efforts to succeed.",
    how: "Speed optimization, mobile-first indexing, site architecture, crawlability improvements."
  },
  {
    icon: Search,
    title: "Strategic Content Planning",
    image: "/s3.png",
    what: "We map out content topics that attract qualified traffic, reflect your expertise, and align with search intent and business goals.",
    why: "Content that serves user needs while targeting relevant keywords drives both rankings and conversions.",
    how: "Content strategy, topic mapping, search intent analysis, editorial planning."
  },
  {
    icon: Target,
    title: "Authority & Link Building",
    image: "/s4.png",
    what: "We secure quality backlinks and citations to increase domain trust and establish your site as an authoritative resource in your niche.",
    why: "Authority signals help search engines understand your expertise and improve your ranking potential.",
    how: "Strategic outreach, content marketing, local citations, relationship building."
  },
  {
    icon: BarChart3,
    title: "Local & On-Page SEO",
    image: "/s5.png",
    what: "We optimize titles, descriptions, schema markup, and Google Business Profile to improve local visibility and click-through rates.",
    why: "Local optimization helps you capture nearby customers while on-page elements influence both rankings and user experience.",
    how: "Title tag optimization, meta descriptions, schema markup, GMB optimization."
  },
  {
    icon: Settings,
    title: "Ongoing Optimization",
    image: "/s6.png",
    what: "We monitor performance monthly, refine strategy based on data, and adapt to algorithm changes to maintain and improve results.",
    why: "SEO is an ongoing process that requires continuous monitoring and optimization to sustain growth.",
    how: "Performance monitoring, strategy refinement, algorithm adaptation, competitive tracking."
  }
];

const seoPhases = [
  {
    phase: "Phase 1 – Foundation",
    title: "Audit & Setup",
    description: "Comprehensive analysis of your current SEO status, technical issues, and competitive opportunities."
  },
  {
    phase: "Phase 2 – Optimization", 
    title: "Technical & Content",
    description: "Implement technical improvements, optimize existing content, and begin strategic content creation."
  },
  {
    phase: "Phase 3 – Growth",
    title: "Authority Building",
    description: "Build quality backlinks, expand content strategy, and optimize for local and long-tail keywords."
  },
  {
    phase: "Phase 4 – Scale",
    title: "Monitoring & Refinement",
    description: "Ongoing optimization, performance tracking, and strategic adjustments based on results and trends."
  }
];

export default function SEOServices() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-white via-[#e6e7e8]/20 to-white overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            {/* Desktop Image */}
            <div className="hidden md:block absolute inset-0">
              <Image
                src="/Hero-03.png"
                alt="SEO Services Background"
                fill
                className="object-cover object-center"
                priority
              />
            </div>
            {/* Mobile Image */}
            <div className="md:hidden absolute inset-0">
              <Image
                src="/a018.jpg"
                alt="SEO Services Background"
                fill
                className="object-cover object-right"
                priority
              />
            </div>
            {/* Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/80 via-[#274290]/60 to-[#f27921]/80"></div>
          </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl lg:text-6xl xl:text-7xl font-black text-white leading-tight mb-8">
              <span className="block">Be Found by the Right People—</span>
              <span className="block text-[#f27921]">Every Time.</span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-6">
              We combine technical precision, keyword strategy, and ongoing optimization to help your website rank higher and convert more visitors.
            </p>
            
            <p className="text-lg text-white/80 leading-relaxed mb-8">
              Our SEO services focus on measurable growth, not vanity metrics—because visibility means nothing without results.
            </p>

            <a 
              href="#contact" 
              className="inline-flex items-center gap-2 bg-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#d6681a] transition-all duration-300 group shadow-lg hover:shadow-xl"
            >
              Request an SEO Consultation
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
                  alt="Our Six-Pillar SEO Services Framework Banner"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                      Our Six-Pillar SEO Services Framework
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                      Six proven pillars that form the foundation of every successful SEO campaign we deliver for lasting growth.
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
                    <div className="p-4 md:p-8">
                      <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
                        {/* Left Column - Image and Number */}
                        <div className="w-full md:w-auto md:flex-shrink-0">
                          <div className="relative mx-auto md:mx-0">
                            {/* Image */}
                            <div className="relative w-full md:w-64 h-48 md:h-48 rounded-xl overflow-hidden shadow-lg">
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
                        <div className="flex-1 w-full">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-lg flex items-center justify-center flex-shrink-0">
                              <IconComponent className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-[#274290]">{standard.title}</h3>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h4 className="font-bold text-[#274290] mb-2">What We Do:</h4>
                              <p className="text-gray-700 leading-relaxed text-sm md:text-base">{standard.what}</p>
                            </div>
                            
                            <div>
                              <h4 className="font-bold text-[#274290] mb-2">Why It Matters:</h4>
                              <p className="text-gray-700 leading-relaxed text-sm md:text-base">{standard.why}</p>
                            </div>
                            
                            <div>
                              <h4 className="font-bold text-[#274290] mb-2">How We Do It:</h4>
                              <p className="text-gray-700 leading-relaxed text-sm md:text-base">{standard.how}</p>
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

      {/* SEO Process Section */}
      <section className="py-24 bg-[#e6e7e8]">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header with Banner */}
            <div className="relative mb-16">
              <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/x001.png"
                  alt="SEO Services Process Banner"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                      SEO Services Process
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                      Every step includes clear explanations and measurable outcomes—no jargon, no guesswork.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {seoPhases.map((phase, index) => (
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
                  This systematic approach means your SEO improves steadily—even if you're not ranking for every keyword from day one.
                </p>
                <p className="text-xl font-bold text-[#274290]">
                  Our SEO isn't about traffic spikes—it's about steady, profitable visibility that keeps working for you.
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
                We build a customized SEO system for your business—one that combines technical foundation, strategic content, and ongoing optimization for lasting growth. You'll see measurable improvements in visibility, traffic, and conversions.
              </p>
              
              <div className="mt-12">
                <a 
                  href="/contact" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-[#274290] px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-lg hover:shadow-xl mx-auto w-fit"
                >
                  Book an SEO Consultation
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
                <div className="text-4xl font-black text-[#f27921] mb-2">+40%</div>
                <div className="text-lg font-semibold text-[#274290]">Organic Traffic Growth</div>
              </div>
              <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
                <div className="text-4xl font-black text-[#f27921] mb-2">+150</div>
                <div className="text-lg font-semibold text-[#274290]">Keywords Ranking</div>
              </div>
              <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
                <div className="text-4xl font-black text-[#f27921] mb-2">+300%</div>
                <div className="text-lg font-semibold text-[#274290]">Click-Through Rate</div>
              </div>
            </div>

            {/* Case Snippet */}
            <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-2xl p-8 text-white text-center mb-16">
              <h3 className="text-2xl font-bold mb-4">Real Results</h3>
              <p className="text-lg leading-relaxed max-w-3xl mx-auto">
                "Most clients see a 20–40% increase in organic traffic within the first 4–6 months through our systematic approach to SEO optimization."
              </p>
            </div>

            {/* Micro Testimonial */}
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <blockquote className="text-xl font-semibold text-gray-800 mb-6 italic">
                "Finally, we're showing up when our customers are searching. Our organic traffic has tripled in 6 months."
              </blockquote>
              <cite className="text-[#274290] font-semibold">— Business Owner</cite>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
