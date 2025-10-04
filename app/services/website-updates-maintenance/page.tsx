import { ArrowRight, Check, Target, Shield, Zap, Eye, BarChart3, Users, TrendingUp, Clock, AlertTriangle, Settings, FileText } from 'lucide-react'
import Image from 'next/image'

const maintenanceProcess = [
  {
    icon: Target,
    title: "Audit & Stabilize",
    description: "We run a full diagnostic to identify speed, security, and structural issues."
  },
  {
    icon: Shield,
    title: "Update & Protect",
    description: "We apply CMS, plug-in, and framework updates safely, with full backups before every change."
  },
  {
    icon: Zap,
    title: "Optimize Performance",
    description: "We monitor loading speed, image compression, and mobile usability."
  },
  {
    icon: Eye,
    title: "Continuous Monitoring",
    description: "Automated alerts keep us informed of downtime or unusual activity."
  },
  {
    icon: BarChart3,
    title: "Report & Improve",
    description: "You receive regular reports summarizing key actions and recommendations."
  }
]

const whatYouGet = [
  {
    title: "Core & Plug-in Updates",
    description: "Safe, tested updates to avoid crashes."
  },
  {
    title: "Performance Optimization",
    description: "Faster load times and smoother navigation."
  },
  {
    title: "Security Monitoring",
    description: "Malware scanning and proactive protection."
  },
  {
    title: "Content & Visual Refreshes",
    description: "Keep copy, images, and offers current."
  },
  {
    title: "Regular Backups",
    description: "Daily or weekly secure backups with quick restore."
  },
  {
    title: "Technical Support",
    description: "Fast response for fixes or troubleshooting."
  },
  {
    title: "Monthly Maintenance Report",
    description: "Clear summary of updates, uptime, and performance trends."
  }
]

const results = [
  "Faster site performance and improved SEO ranking",
  "Reduced downtime and security incidents",
  "Consistent user experience across all devices",
  "Less time spent handling website issues yourself",
  "Peace of mind knowing experts are monitoring your site 24/7"
]

const successMetrics = [
  {
    icon: Clock,
    title: "Page Speed & Uptime",
    description: "measurable in milliseconds and percentages"
  },
  {
    icon: AlertTriangle,
    title: "Error Rate Reduction",
    description: "fewer broken links or failed forms"
  },
  {
    icon: Shield,
    title: "Security Health Score",
    description: "ongoing vulnerability checks"
  },
  {
    icon: Users,
    title: "Client Effort Score",
    description: "how little you need to intervene"
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

export default function WebsiteUpdatesMaintenance() {
  return (
    <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 bg-gradient-to-br from-white via-[#e6e7e8]/20 to-white overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src="/Hero-03.png"
              alt="Website Updates & Maintenance Background"
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
                  <span className="block">Your Website, Always</span>
                  <span className="block text-[#f27921]">Fast, Secure, and Up to Date</span>
                </h1>
                
                <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-6">
                  We keep your site running smoothly—so it's one less thing for you to worry about.
                </p>
                
                <p className="text-lg text-white/80 leading-relaxed mb-8">
                  From updates and backups to performance monitoring and security checks, we maintain your online foundation while you focus on running your business.
                </p>

                <a 
                  href="#contact" 
                  className="inline-flex items-center gap-2 bg-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#d6681a] transition-all duration-300 group shadow-lg hover:shadow-xl"
                >
                  Request a Site Checkup
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </a>
              </div>
              
              {/* Right Column - Empty for balance */}
              <div className="hidden lg:block"></div>
            </div>
          </div>
        </section>

        {/* Why Websites Fall Behind Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section Header with Banner */}
              <div className="relative mb-16">
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="/x002.png"
                    alt="Why Websites Fall Behind Banner"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                        Why Websites Fall Behind
                      </h2>
                      <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        Websites rarely fail overnight—they slow down, break silently, or become outdated without warning.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mb-16">
                <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
                  When that happens, visitors leave, search rankings drop, and opportunities are lost.
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
                      <p className="text-red-700">Slow load times and poor mobile performance</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">Broken links, missing images, or outdated content</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">Outdated plug-ins or themes creating security risks</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">No regular backups or uptime monitoring</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <p className="text-red-700">Limited technical time or know-how to fix issues</p>
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
                      We handle every technical detail behind the scenes. Your website stays secure, optimized, and always aligned with your brand and current offers.
                    </p>
                    <div className="bg-green-200 rounded-lg p-4 mt-6">
                      <p className="text-green-800 font-semibold italic">
                        "Think of us as your site's in-house maintenance team—without adding to your payroll."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Maintenance Process Section */}
        <section className="py-24 bg-[#e6e7e8]">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section Header with Banner */}
              <div className="relative mb-16">
                <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="/x003.png"
                    alt="Our Maintenance Process Banner"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                        Our Maintenance Process
                      </h2>
                      <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        A systematic approach that keeps your site running smoothly
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Process Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {maintenanceProcess.map((step, index) => (
                  <div key={index} className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center mb-6">
                      <span className="text-white font-bold text-xl">{index + 1}</span>
                    </div>
                    <h3 className="text-2xl font-black text-[#274290] mb-4">{step.title}</h3>
                    <p className="text-gray-700 leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>

              <div className="text-center mt-12">
                <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto mb-4">
                  This proven process ensures your website is always running at peak performance and delivers consistent results month after month.
                </p>
                <p className="text-2xl font-bold text-[#274290]">
                  Result: your website stays fast, clean, and worry-free all year.
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
                    alt="What You Get with Website Maintenance Banner"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                        What You Get with Website Maintenance
                      </h2>
                      <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        Comprehensive support that covers every aspect of your website health
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
                  Every technical aspect is handled with care, ensuring your website gets the attention it deserves while you focus on running your business.
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
                  Businesses we maintain see an average 30% improvement in site speed and zero critical downtime per quarter.
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
                      When it comes to website maintenance, uptime only matters if it supports your business growth.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-xl text-gray-700 leading-relaxed">
                  That's why we focus on the metrics that business owners care about most—those that turn technical excellence into real results.
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
                  <Settings className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-[#274290] mb-4">
                  If you never need to think about your website's health again, we've done our job
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Every maintenance decision is made with your business objectives in mind.
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
                <p className="mb-2"><strong>Performance Partner</strong> – regular updates and performance checks</p>
                <p><strong>Strategic Partner</strong> – full maintenance, optimization, and on-demand support</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 bg-gradient-to-br from-[#274290] to-[#f27921]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">
              Keep Your Website Working While You Work on Your Business
            </h2>
            <p className="text-xl text-white/90 leading-relaxed mb-12 max-w-3xl mx-auto">
              Let us handle performance, security, and updates—so you can focus on growth.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <a 
                href="https://calendly.com/northviamarketing" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-[#274290] px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-xl"
              >
                Book a Maintenance Plan Review
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={24} />
              </a>
              <a 
                href="#contact" 
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
              >
                Get a Free Site Audit
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={24} />
              </a>
            </div>
          </div>
        </section>
    </div>
  );
}
