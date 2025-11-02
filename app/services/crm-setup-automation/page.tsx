import { ArrowRight, Users, Zap, Settings, Target, FileText, BarChart3, CheckCircle, Mail, Phone, MessageSquare, Calendar, TrendingUp } from 'lucide-react';
import Image from 'next/image';

const crmStandards = [
  {
    icon: Users,
    title: "Needs Assessment & System Design",
    image: "/s1.png",
    what: "We learn how your business attracts and manages leads to design a CRM structure that fits your workflow perfectly.",
    why: "Every business is different—your CRM should work with your process, not against it.",
    how: "Process mapping, workflow analysis, system architecture design."
  },
  {
    icon: Zap,
    title: "Integration & Connection Setup",
    image: "/s2.png",
    what: "We connect your forms, ads, email, and website into one organized pipeline that captures every lead automatically.",
    why: "Seamless integration ensures no lead falls through the cracks between systems.",
    how: "API connections, form integrations, multi-channel data sync."
  },
  {
    icon: Settings,
    title: "Automation & Workflow Creation",
    image: "/s3.png",
    what: "We build automated follow-ups, reminders, and notifications that keep prospects engaged without manual effort.",
    why: "Automation reduces response time and ensures consistent communication with every lead.",
    how: "Email sequences, task automation, notification systems, lead scoring."
  },
  {
    icon: Target,
    title: "Pipeline & Lead Management",
    image: "/s4.png",
    what: "We create a clear sales pipeline that tracks every opportunity from first contact to close with full visibility.",
    why: "Pipeline transparency helps you forecast sales and identify bottlenecks before they cost deals.",
    how: "Pipeline design, stage definitions, opportunity tracking, conversion analytics."
  },
  {
    icon: BarChart3,
    title: "Reporting & Analytics Setup",
    image: "/s5.png",
    what: "We build custom dashboards and reports that show real-time data on lead flow, conversion rates, and campaign performance.",
    why: "Data-driven insights help you optimize your marketing spend and improve conversion rates.",
    how: "Custom dashboards, automated reports, performance tracking, ROI analysis."
  },
  {
    icon: CheckCircle,
    title: "Training & Optimization",
    image: "/s6.png",
    what: "We train your team on system usage and continuously optimize workflows as your business grows and evolves.",
    why: "Proper training ensures adoption and ongoing optimization maximizes your CRM investment.",
    how: "Team training, workflow optimization, system updates, best practices."
  }
];

const crmPhases = [
  {
    phase: "Phase 1 – Assessment",
    title: "Discovery & Planning",
    description: "Analyze your current lead flow, identify integration points, and design your CRM architecture."
  },
  {
    phase: "Phase 2 – Implementation", 
    title: "Setup & Integration",
    description: "Build your CRM system, connect all data sources, and create automated workflows."
  },
  {
    phase: "Phase 3 – Automation",
    title: "Workflow Creation",
    description: "Develop automated follow-up sequences, notifications, and lead nurturing campaigns."
  },
  {
    phase: "Phase 4 – Optimization",
    title: "Training & Refinement",
    description: "Train your team, monitor performance, and optimize based on real usage data."
  }
];

export default function CRMSetupAutomation() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-white via-[#e6e7e8]/20 to-white overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            {/* Desktop Image */}
            <div className="hidden md:block absolute inset-0">
              <Image
                src="/a024.jpg"
                alt="CRM Setup & Automation Background"
                fill
                className="object-cover object-center"
                priority
              />
            </div>
            {/* Mobile Image */}
            <div className="md:hidden absolute inset-0">
              <Image
                src="/a023.jpg"
                alt="CRM Setup & Automation Background"
                fill
                className="object-cover object-right"
                priority
              />
            </div>
            {/* Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/80 via-[#274290]/60 to-[#f27921]/80"></div>
          </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl lg:text-6xl xl:text-7xl font-black text-white leading-tight mb-8">
              <span className="block">Turn Conversations Into</span>
              <span className="block text-[#f27921]">Conversions.</span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-6">
              We set up your Customer Relationship Management (CRM) system and automate follow-ups—so no lead slips through the cracks.
            </p>
            
            <p className="text-lg text-white/80 leading-relaxed mb-8">
              From setup to integration, we connect your marketing, sales, and operations into one organized system that saves time and drives revenue.
            </p>

            <a 
              href="#contact" 
              className="inline-flex items-center gap-2 bg-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#d6681a] transition-all duration-300 group shadow-lg hover:shadow-xl"
            >
              Request a CRM Setup Consultation
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </a>
          </div>
          
          {/* Right Column - Empty for balance */}
          <div className="hidden lg:block"></div>
        </div>
      </section>

      {/* CRM Standards Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header with Banner */}
            <div className="relative mb-16">
              <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/x005.png"
                  alt="Our Six-Pillar CRM Implementation Framework Banner"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                      Our Six-Pillar CRM Implementation Framework
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                      Six proven pillars that form the foundation of every successful CRM setup and automation we deliver.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-6xl mx-auto">
              {crmStandards.map((standard, index) => {
                const IconComponent = standard.icon
                return (
                  <div key={index} className="bg-white rounded-2xl shadow-xl overflow-hidden mb-12 border border-gray-100">
                    <div className="p-4 md:p-8">
                      <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
                        {/* Left Column - Image and Number */}
                        <div className="w-full md:w-auto md:flex-shrink-0">
                          <div className="relative mx-auto md:mx-0">
                            {/* Image */}
                            <div className="relative w-full md:w-64 h-48 md:h-48 rounded-xl overflow-hidden shadow-lg">
                              <Image
                                src={standard.image}
                                alt={standard.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                            
                            {/* Number Badge */}
                            <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-white font-black text-xl">{index + 1}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Column - Content */}
                        <div className="flex-1 w-full">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-lg flex items-center justify-center flex-shrink-0">
                              <IconComponent className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-[#274290]">{standard.title}</h3>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h4 className="font-bold text-[#274290] mb-2">What We Do:</h4>
                              <p className="text-gray-700 leading-relaxed text-sm md:text-base">{standard.what}</p>
                            </div>
                            
                            <div>
                              <h4 className="font-bold text-[#274290] mb-2">Why It Matters:</h4>
                              <p className="text-gray-700 leading-relaxed text-sm md:text-base">{standard.why}</p>
                            </div>
                            
                            <div>
                              <h4 className="font-bold text-[#274290] mb-2">How We Do It:</h4>
                              <p className="text-gray-700 leading-relaxed text-sm md:text-base">{standard.how}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CRM Process Section */}
      <section className="py-24 bg-[#e6e7e8]">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header with Banner */}
            <div className="relative mb-16">
              <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/x001.png"
                  alt="CRM Setup Process Banner"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/50 via-[#274290]/30 to-[#f27921]/50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
                      CRM Setup Process
                    </h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                      Whether you use HubSpot, Pipedrive, Zoho, or a custom North Via Tech system—we make it work for you.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {crmPhases.map((phase, index) => (
                  <div key={index} className="bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-white font-black text-2xl">{index + 1}</span>
                    </div>
                    
                    <div className="text-sm font-semibold text-[#f27921] mb-2">
                      {phase.phase}
                    </div>
                    
                    <h3 className="text-xl font-black text-[#274290] mb-4">
                      {phase.title}
                    </h3>
                    
                    <p className="text-gray-700 leading-relaxed">
                      {phase.description}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="text-center mt-12">
                <p className="text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto mb-4">
                  This systematic approach means your CRM works efficiently from day one—even as your business grows and evolves.
                </p>
                <p className="text-xl font-bold text-[#274290]">
                  You'll never wonder what happened to a lead again.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promise Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-2xl p-12 text-white">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-8">
                <TrendingUp className="text-white" size={40} />
              </div>
              
              <h2 className="text-3xl lg:text-4xl font-black mb-8">
                Our Promise
              </h2>
              
              <p className="text-xl leading-relaxed">
                We design and implement a CRM that fits your workflow, automates your follow-ups, and gives you full visibility into every customer interaction. You'll have complete confidence that no lead will slip through the cracks.
              </p>
              
              <div className="mt-12">
                <a 
                  href="/contact" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-[#274290] px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-lg hover:shadow-xl mx-auto w-fit"
                >
                  Start CRM Setup
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results & Testimonials Section */}
      <section className="py-24 bg-[#e6e7e8]">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Visual Data Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
                <div className="text-4xl font-black text-[#f27921] mb-2">+40%</div>
                <div className="text-lg font-semibold text-[#274290]">Lead Conversion Rate</div>
              </div>
              <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
                <div className="text-4xl font-black text-[#f27921] mb-2">75%</div>
                <div className="text-lg font-semibold text-[#274290]">Faster Response Time</div>
              </div>
              <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
                <div className="text-4xl font-black text-[#f27921] mb-2">95%</div>
                <div className="text-lg font-semibold text-[#274290]">Lead Capture Rate</div>
              </div>
            </div>

            {/* Case Snippet */}
            <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-2xl p-8 text-white text-center mb-16">
              <h3 className="text-2xl font-bold mb-4">Real Results</h3>
              <p className="text-lg leading-relaxed max-w-3xl mx-auto">
                "Businesses that automate follow-ups convert up to 40% more leads with the same ad spend through consistent, timely communication."
              </p>
            </div>

            {/* Micro Testimonial */}
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
              <blockquote className="text-xl font-semibold text-gray-800 mb-6 italic">
                "Finally, we know exactly where every lead stands. No more guessing or missed opportunities."
              </blockquote>
              <cite className="text-[#274290] font-semibold">— Business Owner</cite>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
