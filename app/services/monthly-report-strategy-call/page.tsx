import { ArrowRight, Check, Target, BarChart3, Users, TrendingUp, Eye, MessageCircle, Clock, FileText, Calendar, Zap } from 'lucide-react'
import Image from 'next/image'

const reportingProcess = [
  {
    icon: Target,
    title: "Collect & Analyze",
    description: "We gather performance data across platforms—ads, social, SEO, and website traffic."
  },
  {
    icon: BarChart3,
    title: "Interpret & Simplify",
    description: "We highlight what matters: conversions, cost efficiency, and growth trends."
  },
  {
    icon: Users,
    title: "Discuss & Plan",
    description: "During your monthly call, we review the data together and decide priorities for next month."
  },
  {
    icon: TrendingUp,
    title: "Implement & Track",
    description: "Agreed actions are rolled into next-cycle campaigns or optimizations."
  },
  {
    icon: Zap,
    title: "Repeat & Improve",
    description: "The process compounds—each month builds on the last, moving you closer to long-term goals."
  }
]

const whatYouGet = [
  {
    title: "Comprehensive Performance Report",
    description: "key insights across ads, SEO, and engagement"
  },
  {
    title: "Plain-Language Summary",
    description: "what worked, what didn't, and why"
  },
  {
    title: "Live Strategy Call",
    description: "collaborative review with actionable next steps"
  },
  {
    title: "Goal Tracking Dashboard",
    description: "monthly benchmarks and progress snapshots"
  },
  {
    title: "Forecasting & Recommendations",
    description: "clear direction for the next phase of growth"
  },
  {
    title: "Access to Expert Guidance",
    description: "direct answers to your business and marketing questions"
  }
]

const results = [
  "Stronger control over marketing direction and spending",
  "Clear understanding of ROI from every channel",
  "Faster, data-driven decision-making",
  "Alignment between marketing, operations, and sales priorities",
  "Continuous growth based on proven performance"
]

const successMetrics = [
  {
    icon: Target,
    title: "Goal Achievement Rate",
    description: "how often monthly goals are met or exceeded"
  },
  {
    icon: Clock,
    title: "Decision Cycle Time",
    description: "faster response to what data shows"
  },
  {
    icon: TrendingUp,
    title: "ROI Growth Trend",
    description: "visible improvement quarter over quarter"
  },
  {
    icon: Users,
    title: "Client Confidence Score",
    description: "you always know where your marketing stands"
  }
]

const bundles = [
  {
    name: "Essential Growth",
    color: "bg-blue-100 text-blue-800 border-blue-200"
  },
  {
    name: "Performance Partner",
    color: "bg-orange-100 text-orange-800 border-orange-200"
  },
  {
    name: "Strategic Partner",
    color: "bg-purple-100 text-purple-800 border-purple-200"
  }
]

export default function MonthlyReportStrategyCall() {
  return (
    <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 bg-gradient-to-br from-white via-[#e6e7e8]/20 to-white overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            {/* Desktop Image */}
            <div className="hidden md:block absolute inset-0">
              <Image
                src="/a025.jpg"
                alt="Monthly Report & Strategy Call Background"
                fill
                className="object-cover object-center"
                priority
              />
            </div>
            {/* Mobile Image */}
            <div className="md:hidden absolute inset-0">
              <Image
                src="/a026.jpg"
                alt="Monthly Report & Strategy Call Background"
                fill
                className="object-cover object-right"
                priority
              />
            </div>
            {/* Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/80 via-[#274290]/60 to-[#f27921]/80"></div>
          </div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[600px]">
              {/* Left Column - Content */}
              <div className="text-left">
                <h1 className="text-4xl lg:text-6xl xl:text-7xl font-black text-white leading-tight mb-8">
                  <span className="block">Clear Numbers.</span>
                  <span className="block text-[#f27921]">Smarter Decisions.</span>
                </h1>
                
                <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-6">
                  We turn your marketing data into plain-language insights and help you plan what comes next.
                </p>
                
                <p className="text-lg text-white/80 leading-relaxed mb-8">
                  Every month, you'll know exactly what's working, what isn't, and where to focus for the biggest impact. No confusing dashboards. No guesswork.
                </p>

                <a 
                  href="/contact" 
                  className="inline-flex items-center gap-2 bg-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#d6681a] transition-all duration-300 group shadow-lg hover:shadow-xl"
                >
                  Schedule Your Next Strategy Call
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </a>
              </div>
              
              {/* Right Column - Empty for balance */}
              <div className="hidden lg:block"></div>
            </div>
          </div>
        </section>

        {/* Why Reports Alone Aren't Enough Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section Header with Waves Background */}
              <div className="relative mb-16">
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#274290] via-[#274290] to-[#1a3a6b]">
                  {/* Waves Pattern */}
                  <div className="absolute inset-0 opacity-20">
                    <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1200 200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0,100 C150,150 350,50 600,100 C850,150 1050,50 1200,100 L1200,200 L0,200 Z" fill="rgba(255,255,255,0.3)"/>
                      <path d="M0,120 C200,170 400,70 600,120 C800,170 1000,70 1200,120 L1200,200 L0,200 Z" fill="rgba(255,255,255,0.2)"/>
                      <path d="M0,140 C250,190 450,90 600,140 C750,190 950,90 1200,140 L1200,200 L0,200 Z" fill="rgba(255,255,255,0.1)"/>
                    </svg>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white relative z-10">
                      <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                        <span className="block text-white">Why Reports Alone</span>
                        <span className="block text-[#f27921]">Aren't Enough</span>
                      </h2>
                      <p className="text-xl text-white max-w-2xl mx-auto">
                        Most marketing reports are pages of numbers without context.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mb-16">
                <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
                  Business owners don't need more data—they need clarity, accountability, and direction.
                </p>
              </div>

              {/* Challenge vs Solution Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                {/* Challenge Card */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-8 border border-red-200">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mr-4">
                      <span className="text-white font-bold text-lg">!</span>
                    </div>
                    <h3 className="text-2xl font-black text-red-800">Common Challenges</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">Reports that show activity but not results</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">Agencies that send PDFs instead of conversations</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">No clear link between data and next-step actions</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">Decisions made on assumptions, not evidence</p>
                    </div>
                  </div>
                </div>

                {/* Solution Card */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border border-green-200">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-black text-green-800">Our Solution</h3>
                  </div>
                  <div className="space-y-4">
                    <p className="text-green-700 leading-relaxed">
                      We don't just send reports—we meet with you to translate numbers into strategy.
                    </p>
                    <div className="bg-green-200 rounded-lg p-4 mt-6">
                      <p className="text-green-800 font-semibold italic">
                        "Every report tells a story, and every story ends with an action plan."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Reporting & Strategy Process Section */}
        <section className="py-24 bg-[#e6e7e8]">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section Header with Banner */}
              <div className="relative mb-16">
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="/x003.png"
                    alt="Our Reporting & Strategy Process Banner"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                        Our Reporting & Strategy Process
                      </h2>
                      <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        A systematic approach that turns data into action
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Process Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {reportingProcess.map((step, index) => (
                  <div key={index} className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                        <span className="text-white font-bold text-lg">{index + 1}</span>
                      </div>
                      <h3 className="text-2xl font-black text-[#274290]">{step.title}</h3>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>

              <div className="text-center mt-12">
                <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto mb-4">
                  This proven process ensures your marketing strategy is always aligned with your business goals and delivers measurable results month after month.
                </p>
                <p className="text-2xl font-bold text-[#274290]">
                  It's like having a marketing director who speaks your language and knows your business.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What You Get Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section Header with Banner */}
              <div className="relative mb-16">
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="/x004.png"
                    alt="What You Get with Monthly Reports & Strategy Calls Banner"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                        What You Get with Monthly Reports & Strategy Calls
                      </h2>
                      <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        Comprehensive support that covers every aspect of your marketing performance
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {whatYouGet.map((service, index) => (
                  <div key={index} className="bg-[#e6e7e8] rounded-2xl p-8 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                        <span className="text-white font-bold text-lg">{index + 1}</span>
                      </div>
                      <h3 className="text-xl font-black text-[#274290]">{service.title}</h3>
                    </div>
                    <p className="text-gray-700 leading-relaxed text-sm">{service.description}</p>
                  </div>
                ))}
              </div>

              <div className="text-center mt-12">
                <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
                  Every element of your reporting strategy is handled with care, ensuring your marketing gets the attention it deserves while you focus on running your business.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Results You Can Expect Section */}
        <section className="py-24 bg-[#e6e7e8]">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section Header with Banner */}
              <div className="relative mb-16">
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="/x005.png"
                    alt="Results You Can Expect Banner"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                        Results You Can Expect
                      </h2>
                      <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        Measurable outcomes that drive your business forward
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {results.map((result, index) => (
                  <div key={index} className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center mb-6">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-xl text-gray-700 leading-relaxed font-semibold">{result}</p>
                  </div>
                ))}
              </div>

              {/* Proof Box */}
              <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-2xl p-8 text-white text-center">
                <h3 className="text-2xl font-black mb-4">Proven Performance</h3>
                <p className="text-xl leading-relaxed">
                  Clients often identify at least one high-impact improvement in every strategy session.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How We Measure Success Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header with Banner */}
            <div className="relative mb-16">
              <div className="relative h-64 rounded-3xl overflow-hidden">
                <Image
                  src="/x007.png"
                  alt="How We Measure Success"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
                      How We Measure Success
                    </h2>
                    <p className="text-xl text-white/90 max-w-3xl mx-auto">
                      When it comes to reporting, data only matters if it guides better decisions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-xl text-gray-700 leading-relaxed">
                  That's why we focus on the metrics that business owners care about most—those that turn numbers into actionable insights.
                </p>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                {successMetrics.map((metric, index) => (
                  <div key={index} className="bg-gradient-to-br from-[#274290] to-[#f27921] rounded-2xl p-8 text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                      <metric.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-black mb-4">
                      {metric.title}
                    </h3>
                    <p className="text-white/90 leading-relaxed">
                      {metric.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Measurement Note */}
              <div className="bg-white border-2 border-[#274290] rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-[#274290] mb-4">
                  Our aim: every report ends with a clear, confident plan for the next 30 days
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Every reporting decision is made with your business objectives in mind.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Included In Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl lg:text-4xl font-black text-[#274290] mb-4">
                  Included In
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  This service is available across all our partnership tiers, with varying levels of depth and detail.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Essential Growth Card */}
                <div className="bg-white rounded-2xl p-8 border-2 border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-300 relative">
                  {/* Sticker-style Title */}
                  <div className="absolute -top-4 left-6 right-6">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg shadow-lg transform rotate-[-2deg]">
                      <h3 className="text-lg font-black text-center tracking-wide">Essential Growth</h3>
                    </div>
                  </div>
                  
                  <div className="pt-8 mt-4">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-700 leading-relaxed">Simplified report + monthly call</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Partner Card */}
                <div className="bg-white rounded-2xl p-8 border-2 border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-300 relative">
                  {/* Sticker-style Title */}
                  <div className="absolute -top-4 left-6 right-6">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg shadow-lg transform rotate-[1deg]">
                      <h3 className="text-lg font-black text-center tracking-wide">Performance Partner</h3>
                    </div>
                  </div>
                  
                  <div className="pt-8 mt-4">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-700 leading-relaxed">Full multi-channel report + strategic roadmap</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strategic Partner Card */}
                <div className="bg-white rounded-2xl p-8 border-2 border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-300 relative">
                  {/* Sticker-style Title */}
                  <div className="absolute -top-4 left-6 right-6">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-lg shadow-lg transform rotate-[-1deg]">
                      <h3 className="text-lg font-black text-center tracking-wide">Strategic Partner</h3>
                    </div>
                  </div>
                  
                  <div className="pt-8 mt-4">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-700 leading-relaxed">Detailed business performance review + quarterly growth planning</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 bg-gradient-to-br from-[#274290] to-[#f27921]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">
              Know Exactly What's Working—And What to Do Next
            </h2>
            <p className="text-xl text-white/90 leading-relaxed mb-12 max-w-3xl mx-auto">
              Stop guessing. Let's use data to guide your next move and keep your marketing accountable.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <a 
                href="/survey"
                className="bg-white text-[#274290] px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-xl"
              >
                Get Free Marketing Report
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={24} />
              </a>
              <a 
                  href="/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 backdrop-blur-sm border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
              >
                Book Your Monthly Strategy Call
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={24} />
              </a>
              <a 
                href="/success-library" 
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
              >
                See a Sample Report
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={24} />
              </a>
            </div>
          </div>
        </section>
    </div>
  );
}
