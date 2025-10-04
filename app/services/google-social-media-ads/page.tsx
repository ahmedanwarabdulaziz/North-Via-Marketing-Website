import { ArrowRight, Check, Target, BarChart3, Users, TrendingUp, DollarSign, Eye, MessageCircle, Calendar } from 'lucide-react'
import Image from 'next/image'

const adProcess = [
  {
    icon: Target,
    title: "Understand Your Business",
    description: "We start by learning your offer, customers, and margins so every ad is built for measurable ROI."
  },
  {
    icon: BarChart3,
    title: "Design the Campaign Strategy",
    description: "We choose platforms, audience segments, and messages that match your goals—whether it's awareness, leads, or direct sales."
  },
  {
    icon: Users,
    title: "Create High-Impact Ads",
    description: "Our creative team produces visuals and copy that stand out while staying on brand."
  },
  {
    icon: TrendingUp,
    title: "Launch & Monitor",
    description: "Campaigns are continuously optimized for clicks, conversions, and cost efficiency."
  },
  {
    icon: BarChart3,
    title: "Report & Refine",
    description: "You receive clear monthly reports showing what worked, what didn't, and what's next."
  }
]

const whatYouGet = [
  {
    title: "Strategic Campaign Planning",
    description: "Custom budget allocation and audience targeting based on real data."
  },
  {
    title: "Professional Ad Creation",
    description: "Visuals, copy, and testing variations built for engagement."
  },
  {
    title: "Ongoing Optimization",
    description: "Continuous improvement of cost-per-click and conversion rate."
  },
  {
    title: "Cross-Platform Consistency",
    description: "Unified messaging across Google, Meta (Facebook/Instagram), YouTube, and LinkedIn."
  },
  {
    title: "Transparent Performance Reports",
    description: "Plain-language summaries and next-step recommendations every month."
  },
  {
    title: "Consultation Access",
    description: "Ask questions anytime; we act as your marketing department."
  }
]

const results = [
  "Lower cost per lead through smarter targeting",
  "Clear understanding of ROI across platforms",
  "More qualified inquiries and conversions",
  "Continuous improvement driven by real performance data",
  "Confidence that every ad dollar is accountable"
]

const successMetrics = [
  {
    icon: Eye,
    title: "Reach & Click-Through Rate (CTR)",
    description: "how effectively ads capture attention"
  },
  {
    icon: MessageCircle,
    title: "Conversion Metrics",
    description: "leads, bookings, or sales generated"
  },
  {
    icon: DollarSign,
    title: "Cost Efficiency",
    description: "cost per result and total ROI"
  },
  {
    icon: Users,
    title: "Audience Growth",
    description: "size and quality of remarketing audiences built for future campaigns"
  }
]

const bundles = [
  {
    name: "Performance Partner",
    color: "bg-orange-100 text-orange-800 border-orange-200"
  },
  {
    name: "Strategic Partner",
    color: "bg-purple-100 text-purple-800 border-purple-200"
  }
]

export default function GoogleSocialMediaAds() {
  return (
    <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 bg-gradient-to-br from-white via-[#e6e7e8]/20 to-white overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src="/Hero-03.png"
              alt="Google & Social Media Ads Background"
              fill
              className="object-cover"
              priority
            />
            {/* Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/80 via-[#274290]/60 to-[#f27921]/80"></div>
          </div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[600px]">
              {/* Left Column - Content */}
              <div className="text-left">
                <h1 className="text-4xl lg:text-6xl xl:text-7xl font-black text-white leading-tight mb-8">
                  <span className="block">Smarter Ads.</span>
                  <span className="block text-[#f27921]">Real Results.</span>
                </h1>
                
                <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-6">
                  We manage your Google and social media ads end-to-end—so you can focus on running your business while we focus on bringing in customers.
                </p>
                
                <p className="text-lg text-white/80 leading-relaxed mb-8">
                  From campaign strategy to budget management and performance tracking, we turn every dollar into data-driven growth.
                </p>

                <a 
                  href="#contact" 
                  className="inline-flex items-center gap-2 bg-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#d6681a] transition-all duration-300 group shadow-lg hover:shadow-xl"
                >
                  Let's Plan Your Next Campaign
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </a>
              </div>
              
              {/* Right Column - Empty for balance */}
              <div className="hidden lg:block"></div>
            </div>
          </div>
        </section>

        {/* Why Online Ads Often Fail Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section Header with Banner */}
              <div className="relative mb-16">
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="/x002.png"
                    alt="Why Online Ads Often Fail Banner"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                        Why Online Ads Often Fail
                      </h2>
                      <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        Running ads isn't the hard part—making them profitable is.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mb-16">
                <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
                  Many businesses waste money on impressions that don't convert, unclear targeting, or campaigns without a follow-up system.
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
                      <p className="text-red-700">Ad spend wasted on unqualified clicks</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">No clear conversion tracking</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">Inconsistent creative and message across platforms</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">Poor audience targeting and retargeting gaps</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">No time to analyze or adjust campaigns</p>
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
                      We manage the entire process: strategy, creative, targeting, and reporting. Every campaign connects directly to your business goals.
                    </p>
                    <div className="bg-green-200 rounded-lg p-4 mt-6">
                      <p className="text-green-800 font-semibold italic">
                        "Our goal isn't to make ads look good—it's to make them perform."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Proven Ad Management Process Section */}
        <section className="py-24 bg-[#e6e7e8]">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section Header with Banner */}
              <div className="relative mb-16">
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="/x003.png"
                    alt="Our Proven Ad Management Process Banner"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                        Our Proven Ad Management Process
                      </h2>
                      <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        A systematic approach that delivers consistent results
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Process Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {adProcess.slice(0, 4).map((step, index) => (
                  <div key={index} className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center mb-6">
                      <span className="text-white font-bold text-xl">{index + 1}</span>
                    </div>
                    <h3 className="text-2xl font-black text-[#274290] mb-4">{step.title}</h3>
                    <p className="text-gray-700 leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>

              {/* Full Width Step */}
              <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 max-w-4xl mx-auto">
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center mr-6">
                    <span className="text-white font-bold text-xl">5</span>
                  </div>
                  <h3 className="text-2xl font-black text-[#274290]">{adProcess[4].title}</h3>
                </div>
                <p className="text-gray-700 leading-relaxed text-lg">{adProcess[4].description}</p>
              </div>

              <div className="text-center mt-12">
                <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto mb-4">
                  This proven process ensures your ad campaigns are always aligned with your business goals and delivers measurable results month after month.
                </p>
                <p className="text-2xl font-bold text-[#274290]">
                  Your total involvement: approve the plan, then review results—everything else is handled.
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
                    alt="What You Get with Our Ad Management Banner"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                        What You Get with Our Ad Management
                      </h2>
                      <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        Comprehensive support that covers every aspect of your ad campaigns
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {whatYouGet.map((service, index) => (
                  <div key={index} className="bg-[#e6e7e8] rounded-2xl p-8 hover:shadow-xl transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center mb-6">
                      <span className="text-white font-bold text-lg">{index + 1}</span>
                    </div>
                    <h3 className="text-xl font-black text-[#274290] mb-4">{service.title}</h3>
                    <p className="text-gray-700 leading-relaxed text-sm">{service.description}</p>
                  </div>
                ))}
              </div>

              <div className="text-center mt-12">
                <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
                  Every element of your ad strategy is handled with care, ensuring your campaigns get the attention they deserve while you focus on running your business.
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
                  Campaigns we manage regularly deliver 2–3× improvement in engagement and conversion compared to their previous self-run ads.
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
                      When it comes to advertising, numbers only matter if they support your business growth.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-xl text-gray-700 leading-relaxed">
                  That's why we focus on the metrics that business owners care about most—those that turn ad spend into real results.
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
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-[#274290] mb-4">
                  We measure results, not guesses
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Every report ties activity to revenue impact.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Included In Section */}
        <section className="py-24 bg-[#e6e7e8]">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl lg:text-4xl font-black text-[#274290] mb-8">
                Included In
              </h2>
              <div className="flex flex-wrap justify-center gap-4">
                {bundles.map((bundle) => (
                  <span
                    key={bundle.name}
                    className={`px-6 py-3 rounded-full text-lg font-semibold border ${bundle.color}`}
                  >
                    {bundle.name}
                  </span>
                ))}
              </div>
              <div className="mt-8 text-lg text-gray-700">
                <p className="mb-2"><strong>Performance Partner</strong> – campaign management + reporting</p>
                <p><strong>Strategic Partner</strong> – campaign management + multi-platform strategy + consulting integration</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 bg-gradient-to-br from-[#274290] to-[#f27921]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">
              Ready to Turn Advertising into Predictable Growth?
            </h2>
            <p className="text-xl text-white/90 leading-relaxed mb-12 max-w-3xl mx-auto">
              Partner with a team that treats your ad budget like an investment, not an experiment.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <a 
                href="https://calendly.com/northviamarketing" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-[#274290] px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-xl"
              >
                Book a Free Strategy Call
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={24} />
              </a>
              <a 
                href="/success-library" 
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
              >
                See Case Studies
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={24} />
              </a>
            </div>
          </div>
        </section>
    </div>
  );
}
