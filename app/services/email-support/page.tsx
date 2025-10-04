import { Check, ArrowRight, Mail, Clock, Target, TrendingUp, Users, MessageSquare } from 'lucide-react';
import Image from 'next/image';

export default function EmailSupport() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/Hero-01.png"
            alt="Email Support"
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
              <span className="block">Fast, Reliable Support—</span>
              <span className="block text-[#f27921]">Without the Inbox Chaos.</span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-8">
              We manage your marketing and technical email requests through a structured ticket system—so you always get quick, accountable answers.
            </p>
            
            <p className="text-lg text-white/80 leading-relaxed mb-8">
              No lost messages, no long waits. Every question and fix is tracked, prioritized, and handled with care.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6">
              <a 
                href="#contact" 
                className="bg-gradient-to-r from-[#274290] to-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
              >
                Send a Support Request.
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
              </a>
              <a 
                href="#contact" 
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
              >
                View Support Options
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Why Traditional Email Support Fails */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-black text-[#274290] mb-8">
              Why Traditional Email Support Fails
            </h2>
            
            <p className="text-xl text-gray-700 leading-relaxed mb-8">
              When everything runs through one cluttered inbox, problems get missed, follow-ups get delayed, and progress slows.
            </p>
            
            <p className="text-lg text-gray-600 leading-relaxed">
              Support should be organized, responsive, and documented.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-[#274290] mb-6">Common Challenges</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Emails lost in long threads or junk folders</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Repeated issues with no clear history or resolution</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Delayed responses due to unclear priorities</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">No visibility into what's being worked on or completed</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#274290] to-[#f27921] rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-6">Our Solution</h3>
                <p className="text-lg leading-relaxed mb-6">
                  We replace random email threads with structured, trackable communication.
                </p>
                <blockquote className="text-xl font-semibold italic border-l-4 border-white/30 pl-4">
                  "Every request becomes a ticket with a timeline, an owner, and a resolution."
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Support Process */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header with Banner */}
            <div className="relative mb-16">
              <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/x003.png"
                  alt="Our Support Process Banner"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                      Our Support Process
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                      You always know who's working on what—and when it'll be done.
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
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Submit a Request</h3>
                <p className="text-gray-600">Send your question or issue to our dedicated support email or portal.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Ticket Creation & Tracking</h3>
                <p className="text-gray-600">Your request is logged automatically, assigned, and tracked until completion.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Priority Assessment</h3>
                <p className="text-gray-600">Urgent issues are flagged and handled first, with estimated resolution times provided.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Response & Resolution</h3>
                <p className="text-gray-600">We reply clearly and directly—no vague updates or endless back-and-forth.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Monthly Summary</h3>
                <p className="text-gray-600">You receive a quick report of tickets handled and any recurring issues spotted.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-black text-[#274290] mb-8">
              What You Get with Email Support
            </h2>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Dedicated Support Channel</h3>
                <p className="text-gray-600">Managed inbox or portal for all client requests.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Guaranteed Response Time</h3>
                <p className="text-gray-600">Fast acknowledgment and clear timelines.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Task Tracking</h3>
                <p className="text-gray-600">Full visibility into open, active, and closed tickets.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Issue History</h3>
                <p className="text-gray-600">Centralized log of past conversations and resolutions.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Priority Escalation</h3>
                <p className="text-gray-600">Urgent tasks handled first, without delays.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Friendly, Professional Communication</h3>
                <p className="text-gray-600">Plain-language responses every time.</p>
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
              Our clients see an average 60% faster issue resolution time after switching to ticket-based support.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Faster Resolutions</h3>
                <p className="text-gray-600">Fewer follow-ups and quicker problem-solving.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Organized Communication</h3>
                <p className="text-gray-600">No more inbox overload or lost messages.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Full Transparency</h3>
                <p className="text-gray-600">Clear visibility into what's been completed.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Better Accountability</h3>
                <p className="text-gray-600">Less stress and more confidence for your team.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Zero Lost Requests</h3>
                <p className="text-gray-600">Confidence that support requests won't get lost or ignored.</p>
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
              Our benchmark: simple communication, fast fixes, zero confusion.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Response Time</h3>
                <p className="text-gray-600">How quickly every request is acknowledged.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Resolution Time</h3>
                <p className="text-gray-600">Average time to complete each ticket.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Ticket Volume Trends</h3>
                <p className="text-gray-600">Identify recurring issues or inefficiencies.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Client Satisfaction</h3>
                <p className="text-gray-600">Follow-up feedback on each resolved request.</p>
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

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-br from-[#274290] to-[#f27921] rounded-2xl p-8 text-white text-center">
                <h3 className="text-2xl font-bold mb-4">Essential Growth</h3>
                <p className="text-lg mb-6">Standard support with same-day responses.</p>
                <div className="text-3xl font-bold">$200</div>
                <div className="text-white/80">CAD / month</div>
              </div>

              <div className="bg-gradient-to-br from-[#f27921] to-[#274290] rounded-2xl p-8 text-white text-center">
                <h3 className="text-2xl font-bold mb-4">Performance Partner</h3>
                <p className="text-lg mb-6">Priority support with faster turnaround.</p>
                <div className="text-3xl font-bold">$400</div>
                <div className="text-white/80">CAD / month</div>
              </div>

              <div className="bg-gradient-to-br from-[#274290] to-[#f27921] rounded-2xl p-8 text-white text-center">
                <h3 className="text-2xl font-bold mb-4">Strategic Partner</h3>
                <p className="text-lg mb-6">Direct access to senior team and proactive support reviews.</p>
                <div className="text-3xl font-bold">$800</div>
                <div className="text-white/80">CAD / month</div>
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
                Get Support That's Organized, Accountable, and Fast.
              </h2>
              
              <p className="text-xl leading-relaxed mb-12">
                Send your first request today and experience how effortless communication can be.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="https://calendly.com/northviamarketing" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-[#274290] px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-lg hover:shadow-xl"
                >
                  Submit a Support Ticket
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                </a>
                <a 
                  href="#contact" 
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
                >
                  View Support Options
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
