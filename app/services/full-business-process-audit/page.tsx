import { Check, ArrowRight, Users, Search, Target, TrendingUp, Calendar, MessageSquare, BarChart3, FileText, Settings } from 'lucide-react';
import Image from 'next/image';

export default function FullBusinessProcessAudit() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/Hero-01.png"
            alt="Full Business Process Audit"
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
              <span className="block">See Your Whole Business</span>
              <span className="block text-[#f27921]">—Clearly.</span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-8">
              We perform a deep analysis of your marketing, sales, and operational systems to identify what's holding back growth—and how to fix it.
            </p>
            
            <p className="text-lg text-white/80 leading-relaxed mb-8">
              You'll receive a prioritized roadmap showing exactly where to streamline, automate, and scale for long-term success.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6">
              <a 
                href="#contact" 
                className="bg-gradient-to-r from-[#274290] to-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
              >
                Request a Full Audit.
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
              </a>
              <a 
                href="#contact" 
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
              >
                See Sample Audit Report
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Why Businesses Hit Growth Ceilings */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-black text-[#274290] mb-8">
              Why Businesses Hit Growth Ceilings
            </h2>
            
            <p className="text-xl text-gray-700 leading-relaxed mb-8">
              When teams, systems, and tools expand quickly, inefficiencies grow silently.
            </p>
            
            <p className="text-lg text-gray-600 leading-relaxed">
              Processes overlap, data goes missing, and time drains away from real progress.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-[#274290] mb-6">Common Challenges</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Disconnected tools across marketing, CRM, and operations</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Repetitive manual work that could be automated</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Poor visibility into lead flow or conversion bottlenecks</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Unclear accountability or overlapping responsibilities</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">No unified performance view across departments</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#274290] to-[#f27921] rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-6">Our Solution</h3>
                <p className="text-lg leading-relaxed mb-6">
                  We audit your entire business ecosystem—marketing, tech stack, communication flow, and sales operations—to reveal bottlenecks and design scalable systems.
                </p>
                <blockquote className="text-xl font-semibold italic border-l-4 border-white/30 pl-4">
                  "Our goal isn't just to point out problems—it's to build a clear path to a stronger, more efficient business."
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Audit Process */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header with Banner */}
            <div className="relative mb-16">
              <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/x001.png"
                  alt="Our Audit Process Banner"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                      Our Audit Process
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                      Every recommendation is specific, realistic, and built around your existing tools and team.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-5 gap-8">
                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Search className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Discovery & Data Collection</h3>
                  <p className="text-gray-600">We gather information about your tools, workflows, and performance metrics.</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">System Mapping</h3>
                  <p className="text-gray-600">We visualize how marketing, operations, and sales interact—highlighting disconnects or redundancies.</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Bottleneck Analysis</h3>
                  <p className="text-gray-600">We identify where time, money, or leads are being lost.</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Optimization Roadmap</h3>
                  <p className="text-gray-600">We create a step-by-step action plan ranked by effort, cost, and impact.</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Presentation & Consultation</h3>
                  <p className="text-gray-600">You receive a clear summary report and a live session to discuss solutions and next steps.</p>
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
                  src="/x003.png"
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
                      Comprehensive audit insights that transform your business operations
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Full Cross-Department Audit</h3>
                  <p className="text-gray-600">Marketing, sales, operations, and customer support.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Workflow Diagrams</h3>
                  <p className="text-gray-600">Visual maps showing how information moves through your business.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Efficiency & Cost Analysis</h3>
                  <p className="text-gray-600">Where you're losing time or budget.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Automation & Integration Plan</h3>
                  <p className="text-gray-600">How to connect and simplify your tools.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Growth Readiness Score</h3>
                  <p className="text-gray-600">Clear metrics for scalability and performance.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Actionable Implementation Roadmap</h3>
                  <p className="text-gray-600">Detailed list of priorities for the next 90 days.</p>
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
              Clients often reclaim 10–20 hours per week and reduce software costs after completing their first audit.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Streamlined Workflows</h3>
                <p className="text-gray-600">Save hours weekly with optimized processes.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Clear System View</h3>
                <p className="text-gray-600">See every system and how they connect.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Fewer Errors</h3>
                <p className="text-gray-600">Reduce duplicated efforts and data silos.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Action Plan</h3>
                <p className="text-gray-600">Convert complexity into clarity.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Sustainable Growth</h3>
                <p className="text-gray-600">Scale through smarter processes.</p>
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
              Our standard: your business should feel lighter, faster, and easier to run.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Process Efficiency Gains</h3>
                <p className="text-gray-600">Time saved per workflow.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Settings className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">System Consolidation Rate</h3>
                <p className="text-gray-600">Reduction in redundant tools or steps.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Error & Delay Reduction</h3>
                <p className="text-gray-600">Measurable drop in missed leads or failed tasks.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Team Productivity Increase</h3>
                <p className="text-gray-600">More output with the same resources.</p>
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
              <p className="text-lg mb-6">Complete business audit + 90-day optimization roadmap and follow-up session.</p>
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
                Turn Complexity Into Clarity.
              </h2>
              
              <p className="text-xl leading-relaxed mb-12">
                We'll show you exactly what's slowing you down—and how to fix it.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="https://calendly.com/northviamarketing" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-[#274290] px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-lg hover:shadow-xl"
                >
                  Book a Full Business Audit
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                </a>
                <a 
                  href="#contact" 
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
                >
                  See Sample Audit Report
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
