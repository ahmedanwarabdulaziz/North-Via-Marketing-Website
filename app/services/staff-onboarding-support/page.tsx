import { Check, ArrowRight, Users, BookOpen, Video, Target, TrendingUp, Calendar, MessageSquare, GraduationCap } from 'lucide-react';
import Image from 'next/image';

export default function StaffOnboardingSupport() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          {/* Desktop Image */}
          <div className="hidden md:block absolute inset-0">
            <Image
              src="/a035.jpg"
              alt="Staff Onboarding Support"
              fill
              className="object-cover object-center"
              priority
            />
          </div>
          {/* Mobile Image */}
          <div className="md:hidden absolute inset-0">
            <Image
              src="/a036.jpg"
              alt="Staff Onboarding Support"
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
              <span className="block">Train Your Team</span>
              <span className="block text-[#f27921]">to Deliver Consistently.</span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-8">
              We help your staff understand your marketing systems, tools, and brand standards—so everyone works efficiently and stays aligned.
            </p>
            
            <p className="text-lg text-white/80 leading-relaxed mb-8">
              From internal playbooks to live walkthroughs, we make sure your team can execute without confusion or guesswork.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6">
              <a 
                href="#contact" 
                className="bg-gradient-to-r from-[#274290] to-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
              >
                Book an Onboarding Session.
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
              </a>
              <a 
                href="#contact" 
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
              >
                See Sample Playbook
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Why Teams Struggle to Stay Consistent */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-black text-[#274290] mb-8">
              Why Teams Struggle to Stay Consistent
            </h2>
            
            <p className="text-xl text-gray-700 leading-relaxed mb-8">
              Even great campaigns fail when the team doesn't fully understand the systems behind them.
            </p>
            
            <p className="text-lg text-gray-600 leading-relaxed">
              When processes live in people's heads, quality drops and mistakes multiply.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-[#274290] mb-6">Common Challenges</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">New staff don't know how to use marketing tools or follow procedures</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Information gets lost between departments or team members</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Messaging and tone vary from one employee to another</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">No centralized documentation or training resources</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 mr-4 flex-shrink-0"></div>
                    <p className="text-gray-700">Repeated errors slow down marketing performance</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#274290] to-[#f27921] rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-6">Our Solution</h3>
                <p className="text-lg leading-relaxed mb-6">
                  We create simple onboarding materials, run live training, and document your workflows—so every team member knows exactly what to do and how to do it.
                </p>
                <blockquote className="text-xl font-semibold italic border-l-4 border-white/30 pl-4">
                  "We turn confusion into confidence, and staff into system pros."
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Onboarding Process */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header with Banner */}
            <div className="relative mb-16">
              <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/x001.png"
                  alt="Our Onboarding Process Banner"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                      Our Onboarding Process
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                      No complex manuals—just clear, practical instructions your team will actually use.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-5 gap-8">
                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Assess Current Workflow</h3>
                  <p className="text-gray-600">We review how your marketing tasks are currently handled and identify weak spots.</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Create Onboarding Materials</h3>
                  <p className="text-gray-600">We prepare simple visual guides, SOPs, and reference sheets customized to your tools.</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Run Training Sessions</h3>
                  <p className="text-gray-600">We host live or recorded walkthroughs to teach your team how to manage daily marketing operations.</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Q&A and Troubleshooting</h3>
                  <p className="text-gray-600">We answer real-world questions to ensure full understanding.</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Ongoing Support</h3>
                  <p className="text-gray-600">As your team grows, we keep your documentation and training up to date.</p>
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
                      Comprehensive training resources that empower your team to succeed
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Customized Onboarding Guide</h3>
                  <p className="text-gray-600">A branded playbook for your tools, tone, and workflows.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <Video className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Video Tutorials & Recordings</h3>
                  <p className="text-gray-600">Accessible step-by-step training for new hires.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Hands-On Team Training</h3>
                  <p className="text-gray-600">Live sessions for sales, admin, or marketing teams.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Documentation Templates</h3>
                  <p className="text-gray-600">SOPs, checklist templates, and best practices.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Process Alignment Review</h3>
                  <p className="text-gray-600">Ensure marketing and operations stay synchronized.</p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-12 h-12 flex items-center justify-center mb-6">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#274290] mb-4">Follow-Up Support</h3>
                  <p className="text-gray-600">Help integrating new tools or refining existing processes.</p>
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
              Well-documented workflows reduce training time for new hires by up to 50%.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Faster Team Ramp-Up</h3>
                <p className="text-gray-600">Fewer onboarding mistakes and quicker productivity.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Consistent Customer Experience</h3>
                <p className="text-gray-600">Uniform service quality across all departments.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Reduced Dependency</h3>
                <p className="text-gray-600">Less reliance on single team members for key processes.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Better Collaboration</h3>
                <p className="text-gray-600">Improved internal communication and accountability.</p>
              </div>

              <div className="text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Stronger Alignment</h3>
                <p className="text-gray-600">Better coordination between staff and company goals.</p>
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
              Our mission: every person on your team knows how to deliver at your brand's standard.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Training Completion Rate</h3>
                <p className="text-gray-600">Percent of team members fully onboarded.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Error Reduction</h3>
                <p className="text-gray-600">Fewer repetitive or procedural mistakes.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">System Adoption Rate</h3>
                <p className="text-gray-600">Usage consistency across tools and platforms.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-4">Staff Confidence Scores</h3>
                <p className="text-gray-600">Feedback on clarity and understanding.</p>
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
                      <p className="text-gray-700 leading-relaxed">Full onboarding creation, live sessions, and documentation updates</p>
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
                Empower Your Team to Work Smarter and More Consistently.
              </h2>
              
              <p className="text-xl leading-relaxed mb-12">
                We'll help your staff master your marketing systems and stay aligned with your brand.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="/contact" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-[#274290] px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-lg hover:shadow-xl"
                >
                  Schedule an Onboarding Session
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                </a>
                <a 
                  href="/contact" 
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
                >
                  See Sample Playbook
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
