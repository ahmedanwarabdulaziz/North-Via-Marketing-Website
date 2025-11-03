import { ArrowRight, Check } from 'lucide-react'
import Image from 'next/image'

const serviceGroups = [
  {
    id: "visibility",
    title: "Get Found by More Customers",
    subtitle: "We bring your business in front of the right local customers.",
    services: [
      {
        id: 1,
        title: "Social Media Management",
        description: "Plan → create → publish → converse → measure. Consistent presence that builds trust and drives inquiries.",
        bundles: ["Essential Growth", "Performance Partner", "Strategic Partner"],
        image: "/s7.png"
      },
      {
        id: 6,
        title: "Google & Social Media Ads",
        description: "Target, test, and tune—spend smarter, not just more.",
        bundles: ["Performance Partner", "Strategic Partner"],
        image: "/s12.png"
      },
      {
        id: 12,
        title: "SEO Services",
        description: "Technical + content + speed—improving steadily month by month.",
        bundles: ["Performance Partner", "Strategic Partner"],
        image: "/s18.png"
      },
      {
        id: 11,
        title: "Custom Design Services",
        description: "On-brand creative that's built for performance, not just looks.",
        bundles: ["Performance Partner", "Strategic Partner"],
        image: "/s17.png"
      }
    ]
  },
  {
    id: "systems",
    title: "Keep Everything Running Smoothly.",
    subtitle: "From site maintenance to client follow-up automation, we build systems that work while you focus on operations.",
    services: [
      {
        id: 2,
        title: "Website Updates & Maintenance",
        description: "Fast fixes + proactive improvements so your site is always secure, quick, and current.",
        bundles: ["Performance Partner", "Strategic Partner"],
        image: "/s8.png"
      },
      {
        id: 7,
        title: "CRM Setup & Automation",
        description: "Centralize leads, automate follow-ups, and measure ROI. (via North Via Tech)",
        bundles: ["Strategic Partner"],
        image: "/s13.png"
      },
      {
        id: 3,
        title: "Monthly Reports & Strategy Calls",
        description: "Clear numbers, plain language, and new priorities every month.",
        bundles: ["Essential Growth", "Performance Partner", "Strategic Partner"],
        image: "/s9.png"
      },
      {
        id: 5,
        title: "Email Support",
        description: "Fast, accountable replies with ticketing, not inbox chaos.",
        bundles: ["Essential Growth", "Performance Partner", "Strategic Partner"],
        image: "/s11.png"
      },
      {
        id: 15,
        title: "Priority Support",
        description: "Front-of-line responses and fast resolution when you need it most.",
        bundles: ["Strategic Partner"],
        image: "/s21.png"
      }
    ]
  },
  {
    id: "consulting",
    title: "Work With a Partner Who Thinks Beyond Ads.",
    subtitle: "We combine marketing data with business consulting to help you make better sales, staffing, and pricing decisions.",
    services: [
      {
        id: 4,
        title: "Business Process Review",
        description: "Spot bottlenecks, quick wins, and simple SOPs that boost throughput.",
        bundles: ["Performance Partner", "Strategic Partner"],
        image: "/s10.png"
      },
      {
        id: 8,
        title: "Customer Experience Suggestions",
        description: "Tiny changes—offers, scripts, flows—that raise conversion and loyalty.",
        bundles: ["Performance Partner", "Strategic Partner"],
        image: "/s14.png"
      },
      {
        id: 9,
        title: "Bi-weekly Strategy Calls",
        description: "Short cycles mean faster learning and quicker wins.",
        bundles: ["Strategic Partner"],
        image: "/s15.png"
      },
      {
        id: 10,
        title: "Staff Onboarding Support",
        description: "Simple playbooks and tool training so the team delivers consistently.",
        bundles: ["Strategic Partner"],
        image: "/s16.png"
      },
      {
        id: 13,
        title: "Unlimited Marketing Consulting",
        description: "Ask anything, anytime—we guide decisions with data.",
        bundles: ["Strategic Partner"],
        image: "/s19.png"
      },
      {
        id: 14,
        title: "Full Business Process Audit",
        description: "Deep dive across marketing → sales → operations with a prioritized roadmap.",
        bundles: ["Strategic Partner"],
        image: "/s20.png"
      },
      {
        id: 16,
        title: "Quarterly Business Health Deep-Dive",
        description: "Zoom-out review, KPIs, and next-quarter plan to keep momentum going.",
        bundles: ["Strategic Partner"],
        image: "/s22.png"
      }
    ]
  }
]

const getServiceRoute = (serviceId: number, serviceTitle: string): string => {
  const routeMap: { [key: number]: string } = {
    1: "/services/social-media-management",
    2: "/services/website-updates-maintenance",
    3: "/services/monthly-report-strategy-call",
    4: "/services/basic-business-process-review",
    5: "/services/email-support",
    6: "/services/google-social-media-ads",
    7: "/services/crm-setup-automation",
    8: "/services/customer-experience-suggestions",
    9: "/services/bi-weekly-strategy-calls",
    10: "/services/staff-onboarding-support",
    11: "/services/custom-design-services",
    12: "/services/seo-services",
    13: "/services/unlimited-marketing-consulting",
    14: "/services/full-business-process-audit",
    15: "/services/priority-support",
    16: "/services/quarterly-business-health-deep-dive"
  }
  return routeMap[serviceId] || "/services"
}

const getBundleColor = (bundle: string) => {
  switch (bundle) {
    case "Essential Growth":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "Performance Partner":
      return "bg-orange-100 text-orange-800 border-orange-200"
    case "Strategic Partner":
      return "bg-purple-100 text-purple-800 border-purple-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export default function Services() {
  return (
    <div className="min-h-screen">
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-white via-[#e6e7e8]/20 to-white overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/a010.png"
            alt="Services Background"
            fill
            className="object-cover object-right md:object-center"
            priority
          />
          {/* Gradient Overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/80 via-[#274290]/60 to-[#f27921]/80"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[600px]">
            {/* Left Column - Content */}
            <div className="text-left">
              <h1 className="text-5xl lg:text-7xl xl:text-8xl font-black text-white leading-tight mb-8">
                Our
                <span className="block text-[#f27921]">Services</span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-8">
                We Manage Your Marketing, So You Can Run Your Business.
              </p>
              
              <p className="text-lg text-white/80 leading-relaxed mb-8">
                From campaigns to systems, we handle marketing and business growth strategy for small and medium businesses across Ontario
              </p>

              <a 
                href="/contact" 
                className="inline-flex items-center gap-2 bg-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#d6681a] transition-all duration-300 group shadow-lg hover:shadow-xl"
              >
                Talk to a Growth Partner
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </a>
            </div>
            
            {/* Right Column - Empty for balance */}
            <div className="hidden lg:block"></div>
          </div>
        </div>
      </section>

      {/* Services Groups Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-[#274290] leading-tight mb-8">
              Services That Drive Results
            </h2>
            <p className="text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto">
              Our services are organized by what matters most: getting you seen, keeping things running smoothly, and growing strategically.
            </p>
          </div>

          <div className="max-w-7xl mx-auto space-y-20">
            {serviceGroups.map((group) => (
              <div key={group.id} className="space-y-8">
                {/* Group Header */}
                <div className="text-center">
                  <h3 className="text-3xl lg:text-4xl font-black text-[#274290] leading-tight mb-4">
                    {group.title}
                  </h3>
                  <p className="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">
                    {group.subtitle}
                  </p>
                </div>

                {/* Services Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {group.services.map((service) => (
                    <div key={service.id} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col">
                      {/* Banner Image */}
                      <div className="relative h-48 overflow-hidden">
                        <Image
                          src={service.image}
                          alt={service.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      
                      {/* Content */}
                      <div className="p-8 flex flex-col flex-grow">
                        <h4 className="text-2xl font-black text-[#274290] mb-4">
                          {service.title}
                        </h4>
                        
                        <p className="text-gray-700 leading-relaxed mb-6 flex-grow">
                          {service.description}
                        </p>
                        
                        {/* Bundle Tags */}
                        <div className="mb-6 mt-auto">
                          <p className="text-sm font-semibold text-gray-600 mb-3">Included in:</p>
                          <div className="flex flex-wrap gap-2">
                            {service.bundles.map((bundle) => (
                              <span
                                key={bundle}
                                className={`px-3 py-1 rounded-full text-xs font-semibold border ${getBundleColor(bundle)}`}
                              >
                                {bundle}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        {/* Learn More Button */}
                        <a 
                          href={getServiceRoute(service.id, service.title)}
                          className="inline-flex items-center gap-2 text-[#f27921] font-semibold hover:text-[#d6681a] transition-colors duration-300 group"
                        >
                          Learn More
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bundle Comparison Section */}
      <section className="py-24 bg-[#e6e7e8]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-[#274290] leading-tight mb-8">
              Choose Your Partnership Level
            </h2>
            <p className="text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto">
              Three flexible bundles designed to scale with your business needs and budget.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Essential Growth Bundle */}
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <h3 className="text-2xl font-black text-[#274290] mb-4">Essential Growth</h3>
                <p className="text-gray-600 mb-6">For new or small businesses</p>
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Social Media Management</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Monthly Reports & Strategy Calls</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Email Support</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Basic Business Guidance</span>
                  </div>
                </div>
              </div>

              {/* Performance Partner Bundle */}
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center border-2 border-[#f27921]">
                <h3 className="text-2xl font-black text-[#274290] mb-4">Performance Partner</h3>
                <p className="text-gray-600 mb-6">For growing teams ready to scale</p>
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Everything in Essential Growth</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Google & Social Media Ads</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">SEO Services</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Website Maintenance</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Business Process Review</span>
                  </div>
                </div>
              </div>

              {/* Strategic Partner Bundle */}
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <h3 className="text-2xl font-black text-[#274290] mb-4">Strategic Partner</h3>
                <p className="text-gray-600 mb-6">Full consulting + marketing department replacement</p>
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Everything in Performance Partner</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">CRM Setup & Automation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Unlimited Marketing Consulting</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Bi-weekly Strategy Calls</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">Priority Support</span>
                  </div>
                </div>
              </div>
            </div>

            {/* View Full Comparison Link */}
            <div className="text-center mt-12">
              <a 
                href="#contact" 
                className="inline-flex items-center gap-2 text-[#f27921] font-semibold hover:text-[#d6681a] transition-colors duration-300 group"
              >
                View Full Comparison
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="rounded-3xl p-12 text-white relative overflow-hidden">
              {/* Background Image */}
              <div className="absolute inset-0">
                <Image
                  src="/a001.png"
                  alt="Success story background"
                  fill
                  className="object-cover"
                  priority
                />
                {/* Gradient Overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/90 via-brand-blue/80 to-brand-orange/90"></div>
              </div>

              <div className="relative z-10">
                <h2 className="text-3xl lg:text-4xl font-black mb-8">
                  Let's grow your business together.
                </h2>
                
                <p className="text-xl leading-relaxed mb-12 opacity-90 max-w-2xl mx-auto">
                  Ready to start growing? Let's discuss which services and bundle level will best accelerate your business growth.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a 
                    href="/survey" 
                    className="bg-white text-[#274290] px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-lg hover:shadow-xl"
                  >
                    Discover Your Business Growth Potential
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                  </a>
                  <a 
                    href="/contact" 
                    className="bg-white/10 backdrop-blur-sm border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
                  >
                    Book a Discovery Call
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                  </a>
                  <a 
                    href="/contact" 
                    className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
                  >
                    Get Started Today
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
