import { ArrowRight, Check, Target, Palette, Users, TrendingUp, Eye, MessageCircle, BarChart3, Zap } from 'lucide-react'
import Image from 'next/image'

const designProcess = [
  {
    icon: Target,
    title: "Understand Your Brand",
    description: "We analyze your audience, messaging, and goals to define the creative direction."
  },
  {
    icon: Palette,
    title: "Develop the Concept",
    description: "We plan layouts, visuals, and copy structure to ensure clarity and alignment with your message."
  },
  {
    icon: Users,
    title: "Create & Refine",
    description: "Our team produces initial concepts, gathers feedback, and perfects the design."
  },
  {
    icon: TrendingUp,
    title: "Deliver & Apply",
    description: "You receive print-ready and digital-ready files, optimized for all platforms."
  },
  {
    icon: Zap,
    title: "Evolve with You",
    description: "As your brand grows, we update templates, color systems, and assets to stay consistent over time."
  }
]

const whatYouGet = [
  {
    title: "Complete Brand Design & Refresh",
    description: "Logos, colors, typography, and visual identity systems."
  },
  {
    title: "Social Media Templates",
    description: "Consistent, editable post layouts that speed up publishing."
  },
  {
    title: "Marketing Collateral",
    description: "Flyers, banners, brochures, or digital ads built for conversion."
  },
  {
    title: "Website & Landing Page Graphics",
    description: "Clean, responsive visuals optimized for web and mobile."
  },
  {
    title: "Branded Presentations & Proposals",
    description: "Professional templates for client and investor use."
  },
  {
    title: "Creative Direction & Consulting",
    description: "Ongoing guidance to keep your visuals strategic, not random."
  }
]

const results = [
  "Unified, recognizable brand image across all channels",
  "Higher engagement and trust through professional visuals",
  "Faster content creation using pre-approved design templates",
  "Clearer communication with customers and partners",
  "Designs that support—not distract from—your marketing goals"
]

const successMetrics = [
  {
    icon: Eye,
    title: "Brand Consistency",
    description: "Does every customer touchpoint look unified?"
  },
  {
    icon: MessageCircle,
    title: "Engagement Metrics",
    description: "Are your visuals improving clicks and shares?"
  },
  {
    icon: TrendingUp,
    title: "Conversion Support",
    description: "Do your designs make it easier for customers to act?"
  },
  {
    icon: Zap,
    title: "Production Efficiency",
    description: "Are you spending less time creating and revising visuals?"
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

export default function CustomDesignServices() {
  return (
    <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 bg-gradient-to-br from-white via-[#e6e7e8]/20 to-white overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src="/Hero-03.png"
              alt="Custom Design Services Background"
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
                  <span className="block">Design That Works</span>
                  <span className="block text-[#f27921]">as Hard as You Do</span>
                </h1>
                
                <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-6">
                  We create on-brand visuals that don't just look good—they move your audience to act.
                </p>
                
                <p className="text-lg text-white/80 leading-relaxed mb-8">
                  From social media graphics and print materials to full brand identities, every design we deliver supports measurable business goals.
                </p>

                <a 
                  href="#contact" 
                  className="inline-flex items-center gap-2 bg-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#d6681a] transition-all duration-300 group shadow-lg hover:shadow-xl"
                >
                  Start Your Next Design Project
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </a>
              </div>
              
              {/* Right Column - Empty for balance */}
              <div className="hidden lg:block"></div>
            </div>
          </div>
        </section>

        {/* Why Most Designs Don't Deliver Results Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section Header with Banner */}
              <div className="relative mb-16">
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="/x002.png"
                    alt="Why Most Designs Don't Deliver Results Banner"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                        Why Most Designs Don't Deliver Results
                      </h2>
                      <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        Design isn't just about style—it's about strategy.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mb-16">
                <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
                  Many businesses struggle with visuals that look nice but fail to communicate clearly or convert attention into action.
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
                      <p className="text-red-700">Designs look inconsistent across platforms</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">Branding feels outdated or unclear</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">Visuals attract attention but don't drive clicks or inquiries</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">No creative process aligned with marketing goals</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">Too much time spent revising without real improvement</p>
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
                      We design with purpose. Every piece we create starts with your business objectives, ensuring your visuals attract, engage, and convert.
                    </p>
                    <div className="bg-green-200 rounded-lg p-4 mt-6">
                      <p className="text-green-800 font-semibold italic">
                        "Our job is to make your brand look professional and perform better."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Design Process Section */}
        <section className="py-24 bg-[#e6e7e8]">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section Header with Banner */}
              <div className="relative mb-16">
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="/x003.png"
                    alt="Our Design Process Banner"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                        Our Design Process
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
                {designProcess.slice(0, 4).map((step, index) => (
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
                  <h3 className="text-2xl font-black text-[#274290]">{designProcess[4].title}</h3>
                </div>
                <p className="text-gray-700 leading-relaxed text-lg">{designProcess[4].description}</p>
              </div>

              <div className="text-center mt-12">
                <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto mb-4">
                  This proven process ensures your designs are always aligned with your business goals and delivers measurable results month after month.
                </p>
                <p className="text-2xl font-bold text-[#274290]">
                  We build your brand library so every new design stays on-brand and effortless to reuse.
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
                    alt="What You Get with Custom Design Services Banner"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                        What You Get with Custom Design Services
                      </h2>
                      <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        Comprehensive support that covers every aspect of your visual identity
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
                  Every design element is handled with care, ensuring your brand gets the attention it deserves while you focus on running your business.
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
                  Clients often see a 30–50% increase in engagement simply from consistent, branded visuals.
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
                      When it comes to design, aesthetics only matter if they support your business growth.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-xl text-gray-700 leading-relaxed">
                  That's why we focus on the metrics that business owners care about most—those that turn visual appeal into real results.
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
                  Our goal: to make your brand look, feel, and perform like a market leader
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Every design decision is made with your business objectives in mind.
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
                <p className="mb-2"><strong>Performance Partner</strong> – Social and web design support</p>
                <p><strong>Strategic Partner</strong> – Full creative direction, branding, and ongoing visual consulting</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 bg-gradient-to-br from-[#274290] to-[#f27921]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">
              Let's Build a Visual Identity That Sells
            </h2>
            <p className="text-xl text-white/90 leading-relaxed mb-12 max-w-3xl mx-auto">
              Partner with our design team to create visuals that strengthen your brand and drive results.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <a 
                href="https://calendly.com/northviamarketing" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-[#274290] px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-xl"
              >
                Book a Design Consultation
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={24} />
              </a>
              <a 
                href="/success-library" 
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
              >
                See Our Work
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={24} />
              </a>
            </div>
          </div>
        </section>
    </div>
  );
}
