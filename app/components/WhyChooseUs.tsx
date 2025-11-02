import { Target, TrendingUp, Cpu, Users, BarChart3, Award } from 'lucide-react'
import Image from 'next/image'

export default function WhyChooseUs() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-5xl lg:text-6xl font-black text-brand-blue leading-tight mb-8">
            Why Choose North Via Marketing?
          </h2>
          <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
            We're more than a marketing service — we're your growth partner.
            Our approach combines strategic marketing, business consultation, and tech-driven solutions so you get results that last, not just quick wins.
          </p>
        </div>

        {/* Key Points Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Strategy Before Action */}
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-brand-orange/20">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-orange to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-brand-blue mb-4 group-hover:text-brand-orange transition-colors duration-300">
              Strategy Before Action
            </h3>
            <p className="text-gray-700 leading-relaxed">
              We start by understanding your business, customers, and goals — every step is backed by a clear plan.
            </p>
            <div className="mt-6 pt-4 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center text-brand-orange text-sm font-semibold">
                <div className="w-2 h-2 bg-brand-orange rounded-full mr-2"></div>
                Learn More
              </div>
            </div>
          </div>

          {/* Business + Marketing Expertise */}
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-brand-orange/20">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-orange to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-brand-blue mb-4 group-hover:text-brand-orange transition-colors duration-300">
              Business + Marketing Expertise
            </h3>
            <p className="text-gray-700 leading-relaxed">
              We don't just run ads — we guide your overall business performance for sustainable growth.
            </p>
            <div className="mt-6 pt-4 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center text-brand-orange text-sm font-semibold">
                <div className="w-2 h-2 bg-brand-orange rounded-full mr-2"></div>
                Learn More
              </div>
            </div>
          </div>

          {/* Tech-Enhanced Growth */}
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-brand-orange/20">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-orange to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <Cpu className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-brand-blue mb-4 group-hover:text-brand-orange transition-colors duration-300">
              Tech-Enhanced Growth
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Through our sister company, North Via Tech, you get access to booking systems, CRMs, and automation tools that make marketing work harder for you.
            </p>
            <div className="mt-6 pt-4 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center text-brand-orange text-sm font-semibold">
                <div className="w-2 h-2 bg-brand-orange rounded-full mr-2"></div>
                Learn More
              </div>
            </div>
          </div>

          {/* Partnership Mindset */}
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-brand-orange/20">
              <div className="w-16 h-16 bg-gradient-to-br from-brand-orange to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-brand-blue mb-4 group-hover:text-brand-orange transition-colors duration-300">
              Partnership Mindset
            </h3>
            <p className="text-gray-700 leading-relaxed">
              We work with you, not just for you — keeping you involved while we handle the heavy lifting.
            </p>
            <div className="mt-6 pt-4 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center text-brand-orange text-sm font-semibold">
                <div className="w-2 h-2 bg-brand-orange rounded-full mr-2"></div>
                Learn More
              </div>
            </div>
              </div>

          {/* Step-by-Step Growth Plans */}
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-brand-orange/20">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-orange to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
              <h3 className="text-xl font-bold text-brand-blue mb-4 group-hover:text-brand-orange transition-colors duration-300">
              Step-by-Step Growth Plans
              </h3>
              <p className="text-gray-700 leading-relaxed">
              No overwhelm and no wasted budget — just clear actions and measurable progress.
            </p>
            <div className="mt-6 pt-4 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center text-brand-orange text-sm font-semibold">
                <div className="w-2 h-2 bg-brand-orange rounded-full mr-2"></div>
                Learn More
              </div>
            </div>
          </div>

          {/* Proven Success Across Industries */}
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-brand-orange/20">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-orange to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <Award className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-brand-blue mb-4 group-hover:text-brand-orange transition-colors duration-300">
              Proven Success Across Industries
            </h3>
            <p className="text-gray-700 leading-relaxed">
              From healthcare and automotive to retail and personal brands, we've helped businesses grow their reach, revenue, and reputation.
            </p>
              <div className="mt-6 pt-4 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center text-brand-orange text-sm font-semibold">
                  <div className="w-2 h-2 bg-brand-orange rounded-full mr-2"></div>
                  Learn More
                </div>
              </div>
            </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
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
              <h3 className="text-3xl lg:text-4xl font-bold mb-6">
                Ready to Build Your Success Story?
              </h3>
              <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Let's discuss how our strategic approach can transform your business growth and create lasting results.
              </p>
              <a 
                href="#contact" 
                className="inline-flex items-center bg-brand-orange text-white px-8 py-4 rounded-xl font-semibold hover:bg-orange-600 transition-all duration-300 group shadow-lg hover:shadow-xl"
              >
                Let's Build Your Next Success Story
                <svg 
                  className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
