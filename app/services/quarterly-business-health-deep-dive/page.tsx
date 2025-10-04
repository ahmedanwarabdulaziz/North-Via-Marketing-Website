import { ArrowRight, BarChart3, TrendingUp, Target, Users, FileText, PieChart, Calendar, Search, Zap, CheckCircle } from 'lucide-react';
import Image from 'next/image';
;

const deepDiveStandards = [
  {
    icon: BarChart3,
    title: "Comprehensive Data Review",
    image: "/s1.png",
    what: "We gather performance data across all active channels and campaigns to create a complete picture of your business performance.",
    why: "Complete visibility prevents missed opportunities and identifies hidden growth potential.",
    how: "Multi-channel analytics, performance tracking, data consolidation."
  },
  {
    icon: TrendingUp,
    title: "Trend Analysis & Pattern Recognition",
    image: "/s2.png",
    what: "We identify growth patterns, performance plateaus, and early warning signs that day-to-day operations might miss.",
    why: "Early trend detection allows for proactive adjustments and strategic pivots.",
    how: "Historical data analysis, growth curve mapping, performance forecasting."
  },
  {
    icon: Target,
    title: "Business Impact Assessment",
    image: "/s3.png",
    what: "We connect marketing metrics to revenue, retention, and operational outcomes to show real business value.",
    why: "Links marketing efforts directly to bottom-line results and business growth.",
    how: "ROI analysis, revenue attribution, operational efficiency metrics."
  },
  {
    icon: Users,
    title: "Strategic Discussion & Alignment",
    image: "/s4.png",
    what: "Together, we evaluate current goals and refine your roadmap for the next quarter with full team alignment.",
    why: "Ensures everyone is working toward the same objectives with clear priorities.",
    how: "Goal evaluation, priority setting, team alignment sessions."
  },
  {
    icon: FileText,
    title: "Action Plan & Forecast",
    image: "/s5.png",
    what: "You receive a clear set of next-quarter priorities with measurable KPIs and realistic timelines.",
    why: "Transforms insights into actionable steps with clear accountability.",
    how: "Strategic roadmapping, KPI definition, timeline creation."
  },
  {
    icon: CheckCircle,
    title: "Continuous Improvement Framework",
    image: "/s6.png",
    what: "We establish systems for ongoing monitoring and quarterly course corrections to maintain growth momentum.",
    why: "Creates sustainable growth patterns rather than reactive fixes.",
    how: "Monitoring systems, review cycles, improvement protocols."
  }
];

const quarterlyPhases = [
  {
    phase: "Quarter 1 – Foundation",
    title: "Discovery & Baseline",
    description: "Establish current performance baselines, identify key metrics, and create measurement frameworks."
  },
  {
    phase: "Quarter 2 – Optimization", 
    title: "Strategic Implementation",
    description: "Implement improvements based on insights, optimize high-impact areas, and track progress."
  },
  {
    phase: "Quarter 3 – Scale",
    title: "Growth Acceleration",
    description: "Scale successful strategies, expand high-performing channels, and refine processes."
  },
  {
    phase: "Quarter 4 – Evolution",
    title: "Strategic Evolution",
    description: "Plan for next year's growth, evolve strategies based on learnings, and set new benchmarks."
  }
];

export default function QuarterlyBusinessHealthDeepDive() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-white via-[#e6e7e8]/20 to-white overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/Hero-03.png"
            alt="Quarterly Business Health Deep-Dive Background"
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
              <span className="block">Step Back.</span>
              <span className="block text-[#f27921]">See the Whole Picture.</span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-6">
              Every quarter, we analyze your marketing, operations, and results to make sure your business is growing in the right direction.
            </p>
            
            <p className="text-lg text-white/80 leading-relaxed mb-8">
              We combine performance data with strategic insight—so you know exactly where you stand and what to do next.
            </p>

            <a 
              href="#contact" 
              className="inline-flex items-center gap-2 bg-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#d6681a] transition-all duration-300 group shadow-lg hover:shadow-xl"
            >
              Book Your Next Deep-Dive
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </a>
          </div>
          
          {/* Right Column - Empty for balance */}
          <div className="hidden lg:block"></div>
        </div>
      </section>

      {/* Deep-Dive Standards Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header with Banner */}
            <div className="relative mb-16">
              <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/x005.png"
                  alt="Our Six-Pillar Deep-Dive Framework Banner"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                      Our Six-Pillar Deep-Dive Framework
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                      Six proven pillars that form the foundation of every successful quarterly business review we deliver.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-6xl mx-auto">
              {deepDiveStandards.map((standard, index) => {
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

      {/* Quarterly Process Section */}
      <section className="py-24 bg-[#e6e7e8]">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header with Banner */}
            <div className="relative mb-16">
              <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/x001.png"
                  alt="Quarterly Business Review Process Banner"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                      Quarterly Business Review Process
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                      A continuous cycle of analysis, optimization, and strategic planning that keeps your business growing in the right direction.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {quarterlyPhases.map((phase, index) => (
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
                  This systematic approach means your business improves steadily — even if you're not optimizing every area at once.
                </p>
                <p className="text-xl font-bold text-[#274290]">
                  Think of it as a quarterly board meeting for your marketing and business growth.
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
                We operate as your strategic business partner, not just a service provider. You'll always know exactly where your business stands, what's working, what needs attention, and what to do next. Every recommendation is based on data and aligned with your growth goals.
              </p>
              
              <div className="mt-12">
                <a 
                  href="https://calendly.com/northviamarketing" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-[#274290] px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-lg hover:shadow-xl mx-auto w-fit"
                >
                  Schedule a Deep-Dive
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
                <div className="text-4xl font-black text-[#f27921] mb-2">+25%</div>
                <div className="text-lg font-semibold text-[#274290]">Faster Annual Growth</div>
              </div>
              <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
                <div className="text-4xl font-black text-[#f27921] mb-2">90%</div>
                <div className="text-lg font-semibold text-[#274290]">Goal Achievement Rate</div>
              </div>
              <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
                <div className="text-4xl font-black text-[#f27921] mb-2">+40%</div>
                <div className="text-lg font-semibold text-[#274290]">Faster Decision Making</div>
              </div>
            </div>

            {/* Case Snippet */}
            <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-2xl p-8 text-white text-center mb-16">
              <h3 className="text-2xl font-bold mb-4">Real Results</h3>
              <p className="text-lg leading-relaxed max-w-3xl mx-auto">
                "Businesses that run quarterly reviews see up to 25% faster annual growth due to consistent course-correction and strategic alignment."
              </p>
            </div>

            {/* Micro Testimonial */}
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <blockquote className="text-xl font-semibold text-gray-800 mb-6 italic">
                "The quarterly deep-dives gave us clarity we never had before. We finally understand what's driving our growth."
              </blockquote>
              <cite className="text-[#274290] font-semibold">— Business Owner</cite>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}