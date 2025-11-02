import { Check, ArrowRight, Users, Clock, Target, TrendingUp, Calendar, MessageSquare, Headphones, Zap, Shield, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

export default function PrioritySupport() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          {/* Desktop Image */}
          <div className="hidden md:block absolute inset-0">
            <Image
              src="/a030.jpg"
              alt="Priority Support"
              fill
              className="object-cover object-center"
              priority
            />
          </div>
          {/* Mobile Image */}
          <div className="md:hidden absolute inset-0">
            <Image
              src="/a029.jpg"
              alt="Priority Support"
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
              <span className="block">When It's Urgent,</span>
              <span className="block text-[#f27921]">We're Already There.</span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-8">
              Get front-of-line access to our support team for critical requests, fixes, and updates—so nothing slows your business down.
            </p>
            
            <p className="text-lg text-white/80 leading-relaxed mb-8">
              Fast response, direct access, and proactive monitoring to keep your marketing systems running smoothly 24/7.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6">
              <a 
                href="#contact" 
                className="bg-gradient-to-r from-[#274290] to-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
              >
                Activate Priority Support.
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
              </a>
              <a 
                href="#contact" 
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
              >
                View Support Plans
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Why Speed Matters */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-black text-[#274290] mb-8">
              Why Speed Matters
            </h2>
            
            <p className="text-xl text-gray-700 leading-relaxed mb-8">
              Marketing doesn't wait. A broken form, ad issue, or website error can cost sales, credibility, and time.
            </p>
            
            <p className="text-lg text-gray-600 leading-relaxed">
              Priority support ensures your business never stalls while waiting for a fix.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-[#274290] mb-6">Common Challenges</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Standard response times that feel too slow when problems are urgent</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Missed opportunities because of downtime or technical errors</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Delays caused by unclear communication or queue-based support</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Limited access to senior specialists when you need them most</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#274290] to-[#f27921] rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-6">Our Solution</h3>
                <p className="text-lg leading-relaxed mb-6">
                  Priority Support gives you direct, fast access to experienced professionals who resolve issues before they affect your business.
                </p>
                <blockquote className="text-xl font-semibold italic border-l-4 border-white/30 pl-4">
                  "We move your requests to the top of the queue—because your time and reputation can't wait."
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Priority Support Process */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header with Banner */}
            <div className="relative mb-16">
              <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/x002.png"
                  alt="Our Priority Support Process Banner"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                      Our Priority Support Process
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                      Average resolution time for priority clients: under 3 hours.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-5 gap-8">
                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Immediate Ticket Acknowledgment</h3>
                  <p className="text-gray-600">Your request is flagged as high-priority the moment it's received.</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Direct Access to Senior Team</h3>
                  <p className="text-gray-600">Experienced specialists handle the issue immediately—no hand-offs or delays.</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Real-Time Communication</h3>
                  <p className="text-gray-600">We keep you updated through every step until the problem is fully resolved.</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Check className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Post-Fix Verification</h3>
                  <p className="text-gray-600">We confirm functionality, monitor stability, and document the resolution.</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Ongoing Preventive Monitoring</h3>
                  <p className="text-gray-600">We proactively check key systems to prevent repeat issues.</p>
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
                      Premium support services that prioritize your business needs
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Fastest Response Time</h3>
                  <p className="text-gray-600">Immediate acknowledgment and rapid fixes.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <Headphones className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Dedicated Support Channel</h3>
                  <p className="text-gray-600">Separate queue for priority tickets.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Access to Senior Specialists</h3>
                  <p className="text-gray-600">Handled directly by top-tier technicians.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Live Updates</h3>
                  <p className="text-gray-600">Real-time progress communication via email or portal.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Preventive Monitoring</h3>
                  <p className="text-gray-600">Early alerts before issues escalate.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Incident Reports</h3>
                  <p className="text-gray-600">Documentation of cause and fix for transparency.</p>
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
              Priority clients experience up to 70% faster issue resolution compared to standard response levels.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Faster Resolution</h3>
                <p className="text-gray-600">Quick fixes for critical issues.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Less Downtime</h3>
                <p className="text-gray-600">Minimal business interruption.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Confidence</h3>
                <p className="text-gray-600">Urgent requests handled first.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Direct Access</h3>
                <p className="text-gray-600">Line to professionals who know your systems.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Peace of Mind</h3>
                <p className="text-gray-600">Problems fixed before customers notice.</p>
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
              Our standard: fast, accountable, transparent support that keeps your business moving.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Average Response Time</h3>
                <p className="text-gray-600">How quickly we begin working on new tickets.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Resolution Speed</h3>
                <p className="text-gray-600">Time from report to completion.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Issue Recurrence Rate</h3>
                <p className="text-gray-600">Prevention success after fix.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Client Uptime Percentage</h3>
                <p className="text-gray-600">Continuous service reliability.</p>
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
                This service is available in our Strategic Partner tier.
              </p>
            </div>

            <div className="max-w-md mx-auto">
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
                      <p className="text-gray-700 leading-relaxed">Full priority access, direct communication channel, and proactive monitoring</p>
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
                Get the Response Speed Your Business Deserves.
              </h2>
              
              <p className="text-xl leading-relaxed mb-12">
                Never wait in line again. With Priority Support, your issues move straight to the top.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="/contact" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-[#274290] px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-lg hover:shadow-xl"
                >
                  Enable Priority Support
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                </a>
                <a 
                  href="/contact" 
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
                >
                  View Support Plans
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
