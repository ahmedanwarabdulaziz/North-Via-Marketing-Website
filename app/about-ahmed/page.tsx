import Image from 'next/image'
import { Award, Briefcase, GraduationCap, Target, TrendingUp, Zap, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function AboutAhmedPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-br from-[#274290] to-[#f27921] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          {/* Desktop Image */}
          <div className="hidden md:block absolute inset-0">
            <Image
              src="/a043.png"
              alt="Ahmed Anwar - Founder & Chief Strategy Architect"
              fill
              className="object-cover object-center"
              priority
            />
          </div>
          {/* Mobile Image */}
          <div className="md:hidden absolute inset-0">
            <Image
              src="/a044.png"
              alt="Ahmed Anwar - Founder & Chief Strategy Architect"
              fill
              className="object-cover object-center"
              priority
            />
          </div>
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/80 via-[#274290]/60 to-[#f27921]/80"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="mb-6">
              <span className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold mb-4">
                Founder & Chief Strategy Architect — North Via Marketing
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight mb-6">
              Ahmed Anwar
            </h1>
            <p className="text-xl md:text-2xl text-white/90 leading-relaxed max-w-3xl mx-auto">
              Bridging marketing strategy and business consulting with over 25 years of cross-industry experience
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            {/* Introduction */}
            <div className="prose prose-lg max-w-none mb-16">
              <div className="bg-gradient-to-r from-[#274290]/5 to-[#f27921]/5 rounded-2xl p-8 md:p-12 mb-12 border-l-4 border-[#f27921]">
                <p className="text-xl md:text-2xl text-gray-800 leading-relaxed font-medium italic">
                  "Marketing must serve the business, not the other way around. Real success happens when marketing strategy, business systems, and customer experience work together. My goal is to help organizations build that connection—turning insight into action and action into measurable growth."
                </p>
                <p className="text-lg text-gray-600 mt-6 font-semibold">— Ahmed Anwar</p>
              </div>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p className="text-lg md:text-xl">
                  With over <strong className="text-[#274290]">25 years of cross-industry experience</strong>, Ahmed Anwar bridges the worlds of marketing strategy and business consulting. His approach blends creative marketing execution with operational insight, helping businesses not only attract customers—but also build scalable, efficient systems that turn growth into sustainability.
                </p>
                
                <p className="text-lg md:text-xl">
                  Ahmed began his career at <strong className="text-[#274290]">FedEx</strong>, where he progressed from operations to Regional Manager. During this time, he mastered logistics, leadership, and systems optimization on an international scale. After two decades of corporate experience, he moved into entrepreneurship and real-estate development, applying his operational discipline to build and grow his own ventures.
                </p>

                <p className="text-lg md:text-xl">
                  To combine experience with academic excellence, Ahmed earned his <strong className="text-[#274290]">MBA</strong> and is currently pursuing his <strong className="text-[#274290]">Doctorate in Business Administration (DBA)</strong>, focusing on strategic management, business transformation, and performance optimization.
                </p>

                <p className="text-lg md:text-xl">
                  At North Via Marketing, Ahmed leads with the belief that marketing is most powerful when aligned with business strategy. His team integrates data-driven marketing with hands-on business consulting to deliver measurable results—helping organizations strengthen their market position, streamline internal processes, and improve customer experience.
                </p>
              </div>
            </div>

            {/* Professional Summary */}
            <div className="bg-[#e6e7e8]/30 rounded-2xl p-8 md:p-12 mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-[#274290] mb-6 flex items-center gap-3">
                <Briefcase className="text-[#f27921]" size={32} />
                Professional Summary
              </h2>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                A strategist and business leader with <strong>25 years of experience</strong> driving organizational growth, operational excellence, and marketing innovation across logistics, real estate, and digital industries. Ahmed's mission is to turn marketing from a cost center into a structured growth engine for modern businesses.
              </p>
            </div>

            {/* Core Expertise */}
            <div className="mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-[#274290] mb-8 flex items-center gap-3">
                <Target className="text-[#f27921]" size={32} />
                Core Expertise
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:border-[#f27921] transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-lg flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#274290] mb-2">Business-Driven Marketing Strategy</h3>
                      <p className="text-gray-600">Aligning marketing initiatives with core business objectives</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:border-[#f27921] transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Award className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#274290] mb-2">Market Positioning & Brand Development</h3>
                      <p className="text-gray-600">Creating distinctive market presence and brand identity</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:border-[#f27921] transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Zap className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#274290] mb-2">Growth Consulting & Operational Optimization</h3>
                      <p className="text-gray-600">Streamlining processes for sustainable business growth</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:border-[#f27921] transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#274290] mb-2">Process Automation & CRM Integration</h3>
                      <p className="text-gray-600">Building efficient systems that scale with your business</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:border-[#f27921] transition-all md:col-span-2">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Target className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#274290] mb-2">Strategic Leadership & Performance Management</h3>
                      <p className="text-gray-600">Driving organizational excellence through data-driven leadership</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Career Highlights */}
            <div className="mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-[#274290] mb-8 flex items-center gap-3">
                <Briefcase className="text-[#f27921]" size={32} />
                Career Highlights
              </h2>
              <div className="space-y-8">
                {/* North Via Marketing */}
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-2xl p-8 md:p-10 text-white">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="text-white" size={32} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl md:text-3xl font-bold mb-3">North Via Marketing</h3>
                      <p className="text-lg font-semibold mb-4 opacity-90">Founder & Chief Strategy Architect</p>
                      <p className="text-lg leading-relaxed opacity-95">
                        Leads an integrated model that merges marketing execution with business consulting. Develops growth strategies, CRM systems, and measurable KPIs that connect marketing outcomes to real business performance.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Real-Estate Development */}
                <div className="bg-white rounded-2xl p-8 md:p-10 shadow-xl border-2 border-gray-100">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#274290]/10 to-[#f27921]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Award className="text-[#274290]" size={32} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl md:text-3xl font-bold text-[#274290] mb-3">Real-Estate Development Ventures</h3>
                      <p className="text-lg font-semibold text-gray-600 mb-4">Founder</p>
                      <p className="text-lg text-gray-700 leading-relaxed">
                        Built and managed multiple projects, combining financial planning, market analysis, and development strategy to achieve sustainable returns.
                      </p>
                    </div>
                  </div>
                </div>

                {/* FedEx */}
                <div className="bg-white rounded-2xl p-8 md:p-10 shadow-xl border-2 border-gray-100">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#274290]/10 to-[#f27921]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Briefcase className="text-[#274290]" size={32} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl md:text-3xl font-bold text-[#274290] mb-3">FedEx</h3>
                      <p className="text-lg font-semibold text-gray-600 mb-4">Regional Manager (Operations & Leadership)</p>
                      <p className="text-lg text-gray-700 leading-relaxed">
                        Started as an operations specialist and rose to regional management, leading multi-site operations and improving efficiency, team performance, and customer delivery metrics across the region.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Education */}
            <div className="bg-gradient-to-br from-[#274290]/5 via-[#274290]/10 to-[#f27921]/5 rounded-2xl p-8 md:p-12 mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-[#274290] mb-8 flex items-center gap-3">
                <GraduationCap className="text-[#f27921]" size={32} />
                Education
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-lg flex items-center justify-center">
                      <GraduationCap className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#274290]">MBA</h3>
                      <p className="text-gray-600">Master of Business Administration</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-[#f27921]">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-lg flex items-center justify-center">
                      <GraduationCap className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#274290]">DBA (in progress)</h3>
                      <p className="text-gray-600">Doctorate in Business Administration</p>
                      <p className="text-sm text-gray-500 mt-1">Specializing in strategic growth systems and organizational leadership</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Representative Results */}
            <div className="mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-[#274290] mb-8 flex items-center gap-3">
                <Award className="text-[#f27921]" size={32} />
                Representative Results
              </h2>
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-[#f27921]">
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Helped healthcare and service businesses <strong className="text-[#274290]">reduce cost per lead and increase conversions</strong> through integrated CRM and ad strategies.
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-[#f27921]">
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Supported local brands in <strong className="text-[#274290]">repositioning their market image</strong>, leading to higher customer retention and referral growth.
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-[#f27921]">
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Designed scalable marketing systems that <strong className="text-[#274290]">improved response time, consistency, and operational clarity</strong> across teams.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#274290] to-[#f27921]">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-6">
              Ready to Work with Ahmed?
            </h2>
            <p className="text-xl md:text-2xl text-white/90 leading-relaxed mb-10 max-w-2xl mx-auto">
              Let's discuss how Ahmed's strategic approach can transform your business growth and create lasting results.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/#contact"
                className="bg-white text-[#274290] px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-xl hover:shadow-2xl"
              >
                Schedule a Consultation
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
              </Link>
              <Link
                href="/survey"
                className="bg-white/10 backdrop-blur-sm border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center group"
              >
                Get Your Free Assessment
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

