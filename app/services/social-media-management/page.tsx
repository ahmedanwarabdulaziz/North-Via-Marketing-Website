import { ArrowRight, Check, Calendar, MessageCircle, BarChart3, Users, Target, FileText, Play, Star, Quote, Eye, TrendingUp } from 'lucide-react';
import Image from 'next/image';

const sampleDesigns = [
  {
    id: 1,
    title: "Testimonial Quote Card",
    type: "Square Post",
    visual: "Client photo or initials in a circle badge, large quote marks, bold headline on blue, subtle orange underline.",
    caption: "Nothing beats real feedback. '{Short client quote}' — {Name, Business}. Want results like this? Let's talk.",
    image: "/s7.png"
  },
  {
    id: 2,
    title: "Before/After Carousel",
    type: "Square, 4 slides",
    visual: "Slide 1 headline on blue; Slides 2–3: before/after photos; Slide 4: CTA panel with website URL.",
    caption: "From {problem} to {result}. Swipe to see the difference. Ready for your transformation? Book now.",
    image: "/s8.png"
  },
  {
    id: 3,
    title: "Service Explainer Reel",
    type: "Vertical Video",
    visual: "15–25 sec reel: hook text → quick 3 benefits → CTA end card with logo & URL.",
    caption: "3 ways our {service} helps you {outcome}. #SmallBusiness #{CityName}",
    image: "/s9.png"
  },
  {
    id: 4,
    title: "Seasonal Offer Post",
    type: "Square",
    visual: "Orange promo badge, product/service image, small calendar icon, terms in fine print.",
    caption: "Limited‑time {Month} offer: {deal}. Save your spot today—DM or tap the link in bio.",
    image: "/s10.png"
  },
  {
    id: 5,
    title: "Educational Tip Carousel",
    type: "Square, 5 slides",
    visual: "Minimal icons, short bullets, blue headers, orange bullets.",
    caption: "Quick tips: {topic}. Save this for later and share with a friend who needs it.",
    image: "/s11.png"
  },
  {
    id: 6,
    title: "Team/Founder Intro",
    type: "Square or Reel",
    visual: "Warm portrait, signature, short bio highlights.",
    caption: "Meet {Name}, the person behind {Brand}. Here's why we love helping {audience} in {city}.",
    image: "/s12.png"
  },
  {
    id: 7,
    title: "UGC/Customer Story",
    type: "Square",
    visual: "Customer photo (with consent), small quote bubble, 5‑star motif.",
    caption: "{Customer first name} trusted us with {job}. Here's how it went—and why they recommend us.",
    image: "/s13.png"
  },
  {
    id: 8,
    title: "FAQ Reel",
    type: "Vertical Video",
    visual: "Text overlays answering top 3 FAQs; end with CTA to DM or book.",
    caption: "Your top questions, answered. Have more? Drop them below or DM us.",
    image: "/s14.png"
  },
  {
    id: 9,
    title: "Google Review Carousel",
    type: "Square",
    visual: "Google star badge, screenshot crop, brand frame.",
    caption: "Another happy client ⭐⭐⭐⭐⭐ Thanks, {Name}! We're here when you need us.",
    image: "/s15.png"
  }
];

const approachSteps = [
  {
    icon: Target,
    title: "Plan",
    description: "Learn your goals and build a content calendar."
  },
  {
    icon: FileText,
    title: "Create",
    description: "Produce visuals and copy that fit your brand voice."
  },
  {
    icon: Calendar,
    title: "Publish",
    description: "Schedule across platforms for maximum visibility."
  },
  {
    icon: MessageCircle,
    title: "Engage",
    description: "Monitor comments and messages, build community."
  },
  {
    icon: BarChart3,
    title: "Report",
    description: "Deliver monthly insights that link activity to outcomes."
  }
];

const whatYouGet = [
  {
    title: "Strategy & Planning",
    description: "Consistent, data-driven content calendars."
  },
  {
    title: "Creative Production",
    description: "Graphics, captions, and ad creatives done for you."
  },
  {
    title: "Scheduling & Automation",
    description: "Reliable posting rhythm."
  },
  {
    title: "Ad Management",
    description: "Ongoing testing and optimization for best ROI."
  },
  {
    title: "Reporting & Consulting",
    description: "Clear monthly metrics with next-step guidance."
  }
];

const results = [
  "Stronger brand recognition and trust",
  "Steady increase in engagement and followers",
  "More inquiries and conversions from social media",
  "Transparent link between marketing effort and business impact"
];

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
];

export default function SocialMediaManagement() {
  return (
    <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 bg-gradient-to-br from-white via-[#e6e7e8]/20 to-white overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src="/Hero-05.png"
              alt="Social Media Management Background"
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
                  <span className="block">We Handle Your Social Media</span>
                  <span className="block text-[#f27921]">So You Can Focus on Running the Business</span>
                </h1>
                
                <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-8">
                  From strategy to design, posting, and engagement, we manage it all—turning social media into a consistent source of visibility and growth.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-6">
                  <a 
                    href="#contact" 
                    className="bg-gradient-to-r from-[#274290] to-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
                  >
                    Start Building Your Online Presence
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                  </a>
                  <a 
                    href="/success-library" 
                    className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
                  >
                    See Real Results
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                  </a>
                </div>
              </div>
              
              {/* Right Column - Empty for balance */}
              <div className="hidden lg:block"></div>
            </div>
          </div>
        </section>

        {/* Social Media Should Feel Like Your Brand Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section Header with Banner */}
              <div className="relative mb-16">
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="/x002.png"
                    alt="Social Media Brand Identity Banner"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                        <span className="block">Social Media Should Feel Like</span>
                        <span className="block text-[#f27921]">Your Brand</span>
                      </h2>
                      <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        Not Just More Noise
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mb-16">
                <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
                  Keeping up with content creation, timing, and engagement can feel endless—and most businesses don't have the hours or data tools to do it right.
                  <br /><br />
                  We take full ownership of your brand presence, so every post has a purpose, every ad has a target, and every effort connects to measurable results.
                </p>
              </div>

              {/* Professional Problem-Solution Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                {/* Challenge Card */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-8 border border-red-200">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mr-4">
                      <span className="text-white font-bold text-lg">!</span>
                    </div>
                    <h3 className="text-2xl font-black text-red-800">The Challenge</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">Social media gets neglected or feels random and off-brand</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">Low engagement, no real inquiries or sales from followers</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">Ad spend with no measurable return</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">Too much time spent without clear results</p>
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
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-green-700">Strategic planning for consistency and quality</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-green-700">Content that drives both conversation and conversion</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-green-700">Data-driven approach for smart investment, not guesswork</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-green-700">Full reporting, constant optimization, and accountability</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Proven Social Media Workflow Section */}
        <section className="py-24 bg-[#e6e7e8]">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section Header with Banner */}
              <div className="relative mb-16">
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="/x003.png"
                    alt="Social Media Workflow Banner"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                        Our Proven Social Media Workflow
                      </h2>
                      <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        A systematic approach that delivers consistent results
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Workflow Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {approachSteps.slice(0, 4).map((step, index) => (
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
                  <h3 className="text-2xl font-black text-[#274290]">{approachSteps[4].title}</h3>
                </div>
                <p className="text-gray-700 leading-relaxed text-lg">{approachSteps[4].description}</p>
              </div>

              <div className="text-center mt-12">
                <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto mb-4">
                  This proven process ensures your social media strategy is always aligned with your business goals and delivers measurable results month after month.
                </p>
                <p className="text-2xl font-bold text-[#274290]">
                  Your total time investment: under one hour per week.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What You Get with Social Media Management Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section Header with Banner */}
              <div className="relative mb-16">
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="/x004.png"
                    alt="What You Get Banner"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                        What You Get with Social Media Management
                      </h2>
                      <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        Comprehensive support that covers every aspect of your social presence
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
                  Every element of your social media strategy is handled with care, ensuring your brand gets the attention it deserves while you focus on running your business.
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {results.map((result, index) => (
                  <div key={index} className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center mb-6">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-xl text-gray-700 leading-relaxed font-semibold">{result}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* See the Difference: Proof & Portfolio Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section Header with Banner */}
              <div className="relative mb-16">
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="/x006.png"
                    alt="Proof & Portfolio Banner"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                        See the Difference: Proof & Portfolio
                      </h2>
                      <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        Real results from real businesses
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client Success Snapshots */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                <div className="bg-gradient-to-br from-[#274290] to-[#f27921] rounded-2xl p-8 text-white text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-black mb-4">300% ROI</h3>
                  <p className="text-white/90">Average return on social media investment</p>
                </div>
                <div className="bg-gradient-to-br from-[#274290] to-[#f27921] rounded-2xl p-8 text-white text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-black mb-4">500+ Leads</h3>
                  <p className="text-white/90">Generated through social media campaigns</p>
                </div>
                <div className="bg-gradient-to-br from-[#274290] to-[#f27921] rounded-2xl p-8 text-white text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Star className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-black mb-4">4.8/5 Rating</h3>
                  <p className="text-white/90">Client satisfaction score</p>
                </div>
              </div>

              {/* Sample Social Post Designs */}
              <div className="mb-16">
                <h3 className="text-3xl font-black text-[#274290] mb-8 text-center">
                  Sample Social Post Designs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sampleDesigns.map((design, index) => (
                    <div key={index} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-100">
                      <div className="relative h-48 overflow-hidden">
                        <Image
                          src={design.image}
                          alt={`${design.title} Example`}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-4 left-4 px-3 py-1 bg-[#f27921] text-white text-xs font-semibold rounded-full">
                          {design.type}
                        </div>
                      </div>
                      <div className="p-6">
                        <h4 className="text-xl font-black text-[#274290] mb-3">
                          {design.title}
                        </h4>
                        <p className="text-gray-600 text-xs font-medium mb-2">
                          {design.type}
                        </p>
                        <p className="text-gray-700 leading-relaxed text-sm">
                          {design.visual}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Portfolio Visuals Note */}
              <div className="text-center mb-12">
                <div className="bg-gradient-to-r from-[#274290]/10 to-[#f27921]/10 rounded-2xl p-8 border border-[#274290]/20 max-w-4xl mx-auto">
                  <p className="text-lg text-gray-700 leading-relaxed mb-6">
                    Every design and campaign is tailored for your industry, voice, and goals—not "one-size-fits-all" content.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a 
                      href="/success-library" 
                      className="bg-gradient-to-r from-[#274290] to-[#f27921] text-white px-6 py-3 rounded-lg font-semibold hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
                    >
                      Browse Success Library
                      <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                    </a>
                    <a 
                      href="#contact" 
                      className="border-2 border-[#274290] text-[#274290] px-6 py-3 rounded-lg font-semibold hover:bg-[#274290] hover:text-white transition-all duration-300 flex items-center justify-center group"
                    >
                      Request Custom Samples
                      <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                    </a>
                  </div>
                </div>
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
                      When it comes to social media, numbers only matter if they support your business growth.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-xl text-gray-700 leading-relaxed">
                  That's why we focus on the metrics that business owners care about most—those that turn digital engagement into real results.
                </p>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                {/* Reach & Visibility */}
                <div className="bg-gradient-to-br from-[#274290] to-[#f27921] rounded-2xl p-8 text-white">
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-black mb-4">
                    Reach & Visibility
                  </h3>
                  <p className="text-white/90 leading-relaxed">
                    How many people discover your brand.
                  </p>
                </div>

                {/* Engagement */}
                <div className="bg-gradient-to-br from-[#274290] to-[#f27921] rounded-2xl p-8 text-white">
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                    <MessageCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-black mb-4">
                    Engagement
                  </h3>
                  <p className="text-white/90 leading-relaxed">
                    Saves, clicks, and direct messages that show interest.
                  </p>
                </div>

                {/* Business Impact */}
                <div className="bg-gradient-to-br from-[#274290] to-[#f27921] rounded-2xl p-8 text-white">
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-black mb-4">
                    Business Impact
                  </h3>
                  <p className="text-white/90 leading-relaxed">
                    Leads, calls, and sales traced back to campaigns.
                  </p>
                </div>
              </div>

              {/* Business Impact Details */}
              <div className="bg-[#e6e7e8] rounded-2xl p-8 mb-12">
                <h3 className="text-2xl font-black text-[#274290] mb-6 text-center">
                  Real Business Outcomes We Track
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-[#f27921] rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-gray-700 font-semibold">
                      Inquiries generated from posts and campaigns
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-[#f27921] rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-gray-700 font-semibold">
                      Bookings or appointments tied to social activity
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-[#f27921] rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-gray-700 font-semibold">
                      Customer messages that lead to sales
                    </p>
                  </div>
                </div>
              </div>

              {/* Continuous Reporting */}
              <div className="bg-white border-2 border-[#274290] rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-[#274290] mb-4">
                  Continuous Reporting & Recommendations
                </h3>
                <p className="text-gray-700 leading-relaxed mb-6">
                  You'll receive easy-to-read monthly reports and always know what's working, why, and where adjustment will bring you even better results.
                </p>
                <p className="text-lg text-[#274290] font-semibold">
                  With North Via Marketing, you're never in the dark: your social media strategy adapts and improves, driven by data and focused on what makes a difference to your business—not just vanity metrics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Ready to Grow Your Brand CTA Section */}
        <section className="py-20 bg-gradient-to-br from-[#274290] to-[#f27921]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">
              Ready to Turn Social Media into a Reliable Growth Channel?
            </h2>
            <p className="text-xl text-white/90 leading-relaxed mb-12 max-w-3xl mx-auto">
              Partner with North Via Marketing to turn your social presence into a powerful growth engine—building trust, driving enquiries, and delivering measurable results. Focus on what you do best: running your business, while we handle the rest.
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
                See More Examples
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={24} />
              </a>
            </div>
          </div>
        </section>
    </div>
  );
}
