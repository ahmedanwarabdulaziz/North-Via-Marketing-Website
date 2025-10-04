import { Check, ArrowRight, Users, Clock, Target, TrendingUp, Calendar, MessageSquare } from 'lucide-react';
import Image from 'next/image';

export default function BiWeeklyStrategyCalls() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/Hero-01.png"
            alt="Bi-Weekly Strategy Calls"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl lg:text-6xl xl:text-7xl font-black text-white leading-tight mb-8">
              <span className="block">Stay Aligned.</span>
              <span className="block text-[#f27921]">Move Faster.</span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-8">
              We meet every two weeks to review progress, make quick adjustments, and keep your marketing aligned with your business goals.
            </p>
            
            <p className="text-lg text-white/80 leading-relaxed mb-8">
              Short, focused sessions that turn insights into immediate action.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6">
              <a 
                href="#contact" 
                className="bg-gradient-to-r from-[#274290] to-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
              >
                Book Your First Strategy Call.
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
              </a>
              <a 
                href="#contact" 
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
              >
                See How It Works
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Why Waiting a Month Is Too Long */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-black text-[#274290] mb-8">
              Why Waiting a Month Is Too Long
            </h2>
            
            <p className="text-xl text-gray-700 leading-relaxed mb-8">
              Markets change quickly. So do algorithms, customer habits, and campaign performance.
            </p>
            
            <p className="text-lg text-gray-600 leading-relaxed">
              Waiting a full month to adjust strategy slows growth and wastes opportunities.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-[#274290] mb-6">Common Challenges</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Long gaps between check-ins delay important decisions</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Small issues become big problems before they're noticed</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Marketing and sales lose alignment over time</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">No real-time feedback on campaigns or results</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#274290] to-[#f27921] rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-6">Our Solution</h3>
                <p className="text-lg leading-relaxed mb-6">
                  We meet with you twice a month to analyze fresh data, discuss what's working, and pivot immediately when needed.
                </p>
                <blockquote className="text-xl font-semibold italic border-l-4 border-white/30 pl-4">
                  "Short cycles mean faster learning, quicker wins, and steadier growth."
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Bi-Weekly Call Framework */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header with Banner */}
            <div className="relative mb-16">
              <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/x002.png"
                  alt="Our Bi-Weekly Call Framework Banner"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                      Our Bi-Weekly Call Framework
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                      Each session runs 20–30 minutes—compact, practical, and highly focused.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-5 gap-8">
                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Review Key Metrics</h3>
                  <p className="text-gray-600">We check ad performance, SEO progress, and engagement trends.</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Identify Opportunities</h3>
                  <p className="text-gray-600">Spot fast-moving tactics or channels that deserve attention.</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Adjust & Assign Actions</h3>
                  <p className="text-gray-600">Define next steps for both teams with clear ownership.</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Plan the Next Two Weeks</h3>
                  <p className="text-gray-600">Set small, achievable goals tied directly to measurable outcomes.</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Document & Follow Up</h3>
                  <p className="text-gray-600">After every call, you receive a concise summary with decisions and deadlines.</p>
                </div>
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
                      Comprehensive support that keeps your marketing aligned and moving forward
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Twice-Monthly Strategy Sessions</h3>
                  <p className="text-gray-600">Proactive collaboration to stay on target.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Real-Time Campaign Insights</h3>
                  <p className="text-gray-600">Early visibility into trends and performance.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Action Plans After Every Call</h3>
                  <p className="text-gray-600">Clear next steps and accountability.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Priority Discussion Slots</h3>
                  <p className="text-gray-600">Quick feedback on urgent items between sessions.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Data Dashboard Access</h3>
                  <p className="text-gray-600">See metrics live, not just in monthly reports.</p>
                </div>
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
              Clients who switch to bi-weekly calls cut decision time by 40% and see faster campaign optimizations.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Faster Decision-Making</h3>
                <p className="text-gray-600">Quick implementation and immediate results.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Immediate Fixes</h3>
                <p className="text-gray-600">No end-of-month surprises or delayed solutions.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Stronger Alignment</h3>
                <p className="text-gray-600">Better coordination between marketing, sales, and operations.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Steady Progress</h3>
                <p className="text-gray-600">Continuous momentum backed by data and regular feedback.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Clear Accountability</h3>
                <p className="text-gray-600">Measurable momentum and defined responsibilities.</p>
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
              Our benchmark: no wasted time, no unclear next steps.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Action Completion Rate</h3>
                <p className="text-gray-600">How many agreed tasks are finished before the next call.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Adjustment Speed</h3>
                <p className="text-gray-600">Time from insight to implementation.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Performance Trend</h3>
                <p className="text-gray-600">Improvements across ad, SEO, and engagement metrics.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Goal Progression</h3>
                <p className="text-gray-600">Consistent forward movement toward quarterly targets.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Included In */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-black text-[#274290] mb-8">
              Included In
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-[#f27921] to-[#274290] rounded-2xl p-8 text-white text-center">
              <h3 className="text-2xl font-bold mb-4">Strategic Partner</h3>
              <p className="text-lg mb-6">Full bi-weekly sessions + performance tracking dashboard.</p>
              <div className="text-3xl font-bold">$800</div>
              <div className="text-white/80">CAD / month</div>
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
                Turn Every Two Weeks Into Measurable Progress.
              </h2>
              
              <p className="text-xl leading-relaxed mb-12">
                Stay in sync, move faster, and keep your marketing momentum strong.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="https://calendly.com/northviamarketing" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-[#274290] px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-lg hover:shadow-xl"
                >
                  Schedule a Strategy Call
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                </a>
                <a 
                  href="#contact" 
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
                >
                  See How It Works
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
