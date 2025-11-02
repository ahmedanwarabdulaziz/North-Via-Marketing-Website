import { Check, ArrowRight, Users, Clock, Target, TrendingUp, Zap } from 'lucide-react';
import Image from 'next/image';

export default function BasicBusinessProcessReview() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          {/* Desktop Image */}
          <div className="hidden md:block absolute inset-0">
            <Image
              src="/a032.jpg"
              alt="Business Process Review"
              fill
              className="object-cover object-center"
              priority
            />
          </div>
          {/* Mobile Image */}
          <div className="md:hidden absolute inset-0">
            <Image
              src="/a031.jpg"
              alt="Business Process Review"
              fill
              className="object-cover object-right"
              priority
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl lg:text-6xl xl:text-7xl font-black text-white leading-tight mb-8">
              <span className="block">Find the Bottlenecks.</span>
              <span className="block text-[#f27921]">Fix the Flow.</span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-8">
              We analyze how your marketing, sales, and operations connect—then identify small process improvements that create big business gains.
            </p>
            
            <p className="text-lg text-white/80 leading-relaxed mb-8">
              Simple, actionable insights that make your day-to-day run smoother and more profitably.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6">
              <a 
                href="#contact" 
                className="bg-gradient-to-r from-[#274290] to-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
              >
                Book a Business Review.
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
              </a>
              <a 
                href="#contact" 
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
              >
                See Sample Action Plan
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Why Many Businesses Plateau */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-black text-[#274290] mb-8">
              Why Many Businesses Plateau
            </h2>
            
            <p className="text-xl text-gray-700 leading-relaxed mb-8">
              Growth often slows not because of poor marketing, but because internal processes aren't built to scale.
            </p>
            
            <p className="text-lg text-gray-600 leading-relaxed">
              When workflows, tools, or communication break down, results do too.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-[#274290] mb-6">Common Challenges</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Leads fall through the cracks between marketing and sales</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Repetitive manual work slows down response time</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Inconsistent follow-up processes reduce conversions</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">No unified system for tracking performance</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Owners spend more time fixing problems than driving growth</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#274290] to-[#f27921] rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-6">Our Solution</h3>
                <p className="text-lg leading-relaxed mb-6">
                  We step into your business operations—observe, map, and simplify.
                </p>
                <blockquote className="text-xl font-semibold italic border-l-4 border-white/30 pl-4">
                  "We find the gaps that waste time, lose leads, and limit growth—then give you a simple roadmap to fix them."
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Review Process */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header with Banner */}
            <div className="relative mb-16">
              <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/x001.png"
                  alt="Our Review Process Banner"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                      Our Review Process
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                      No jargon, no lengthy audits—just clarity on where to focus first.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-5 gap-8">
              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Discovery Call</h3>
                <p className="text-gray-600">We discuss your goals, tools, and team structure.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Process Mapping</h3>
                <p className="text-gray-600">We outline your existing customer journey and identify weak spots.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Gap Analysis</h3>
                <p className="text-gray-600">We locate missed opportunities, inefficiencies, or duplicated work.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Quick-Win Recommendations</h3>
                <p className="text-gray-600">You receive prioritized, low-effort improvements that bring fast results.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Action Plan Delivery</h3>
                <p className="text-gray-600">We summarize everything in a short, visual report ready for immediate use.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-24 bg-gray-50">
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
                      What You Get
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                      Clear deliverables that help you improve your business processes
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-xl font-bold text-[#274290] mb-4">Custom Workflow Diagram</h3>
                <p className="text-gray-600">Clear overview of your current process.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-xl font-bold text-[#274290] mb-4">List of Bottlenecks & Inefficiencies</h3>
                <p className="text-gray-600">What's slowing you down.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-xl font-bold text-[#274290] mb-4">Quick-Fix Recommendations</h3>
                <p className="text-gray-600">Top actions you can take immediately.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-xl font-bold text-[#274290] mb-4">Integration Suggestions</h3>
                <p className="text-gray-600">Tools or automations to simplify operations.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-xl font-bold text-[#274290] mb-4">Follow-Up Call</h3>
                <p className="text-gray-600">Review changes, next steps, and deeper consulting options.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results You Can Expect */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-black text-[#274290] mb-8">
              Results You Can Expect
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Most clients see measurable efficiency improvements within the first 30 days.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Faster Response Time</h3>
                <p className="text-gray-600">Smoother customer flow and quicker turnaround.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Less Wasted Time</h3>
                <p className="text-gray-600">Reduced manual or repetitive work.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Better Collaboration</h3>
                <p className="text-gray-600">Improved coordination between marketing and sales.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Clear Visibility</h3>
                <p className="text-gray-600">Better insight into your business operations.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Immediate Productivity Boost</h3>
                <p className="text-gray-600">Measurable improvements without major system changes.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How We Measure Success */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-black text-[#274290] mb-8">
              How We Measure Success
            </h2>
            <p className="text-lg text-gray-600">
              Our focus: make your business easier to run every day.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Time Saved per Process</h3>
                <p className="text-gray-600">Measurable reduction in effort per task.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Lead Conversion Flow</h3>
                <p className="text-gray-600">Fewer dropped leads between marketing and sales.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Automation Readiness Score</h3>
                <p className="text-gray-600">How well your systems support scaling.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Team Feedback</h3>
                <p className="text-gray-600">Smoother internal communication and task ownership.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Included In */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-black text-[#274290] mb-4">
                Included In
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                This service is available across our partnership tiers, with varying levels of depth and detail.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
                      <p className="text-gray-700 leading-relaxed">Single business process review + recommendations</p>
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
                      <p className="text-gray-700 leading-relaxed">In-depth multi-department review + implementation guidance</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-2xl p-12 text-white">
              <h2 className="text-3xl lg:text-4xl font-black mb-8">
                Simplify Your Systems. Multiply Your Results.
              </h2>
              
              <p className="text-xl leading-relaxed mb-12">
                A one-hour review could save you dozens every month.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="/contact" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-[#274290] px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-lg hover:shadow-xl"
                >
                  Book a Free Review Call
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                </a>
                <a 
                  href="/contact" 
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
                >
                  See Sample Action Plan
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
