import { Search, Target, Settings, TrendingUp, Rocket } from 'lucide-react'

const processSteps = [
  {
    step: "Step 1",
    title: "Discover",
    description: "We start with a deep dive into your business — understanding your goals, audience, competition, and current challenges.",
    outcome: "A clear picture of where you are now and where you want to go.",
    icon: Search
  },
  {
    step: "Step 2",
    title: "Strategize",
    description: "We build a tailored marketing & business growth plan that matches your budget, goals, and timeline.",
    outcome: "A practical roadmap with prioritized actions.",
    icon: Target
  },
  {
    step: "Step 3",
    title: "Execute",
    description: "We put the plan into action — from campaigns and content to system improvements (powered by North Via Tech).",
    outcome: "Marketing and operations working together for faster growth.",
    icon: Settings
  },
  {
    step: "Step 4",
    title: "Optimize",
    description: "We track results, review performance, and adjust strategies to keep improving month after month.",
    outcome: "Consistent, measurable growth you can rely on.",
    icon: TrendingUp
  },
  {
    step: "Step 5",
    title: "Expand",
    description: "When you're ready, we scale into new markets, services, or platforms — always with your business goals in mind.",
    outcome: "Growth that compounds over time.",
    icon: Rocket
  }
]

export default function HowItWorks() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-5xl lg:text-6xl font-black text-[#274290] leading-tight mb-8">
            Our Partnership Path to Growth
          </h2>
          <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
            Every successful project follows a clear, collaborative process.
            Here's how we work with you from the first conversation to measurable results.
          </p>
        </div>

        {/* Process Steps */}
        <div className="relative">
          {/* Desktop Flow Indicator */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-[#f27921] via-[#f27921]/50 to-[#f27921] opacity-30"></div>
          
          {/* Steps Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-4">
            {processSteps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={index} className="relative flex flex-col">
                  {/* Step Card */}
                  <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 text-center lg:text-left flex flex-col h-full">
                    {/* Step Number */}
                    <div className="text-sm font-semibold text-[#f27921] mb-2">
                      {step.step}
                    </div>
                    
                    {/* Icon */}
                    <div className="w-16 h-16 bg-gradient-to-br from-[#f27921]/10 to-[#f27921]/20 rounded-2xl flex items-center justify-center mx-auto lg:mx-0 mb-4">
                      <IconComponent className="w-8 h-8 text-[#f27921]" />
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-xl font-bold text-[#274290] mb-4">
                      {step.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-gray-700 leading-relaxed mb-4 flex-grow">
                      {step.description}
                    </p>
                    
                    {/* Outcome */}
                    <div className="bg-[#e6e7e8]/30 rounded-lg p-3 mt-auto">
                      <p className="text-sm font-semibold text-[#274290] mb-1">Outcome:</p>
                      <p className="text-sm text-gray-700">{step.outcome}</p>
                    </div>
                  </div>
                  
                  {/* Mobile Flow Indicator */}
                  {index < processSteps.length - 1 && (
                    <div className="lg:hidden flex justify-center mt-6">
                      <div className="w-0.5 h-8 bg-gradient-to-b from-[#f27921] to-transparent"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Optional Note */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-500 italic">
            Step 5 (Expand) is an optional future stage when you're ready to scale
          </p>
        </div>
      </div>
    </section>
  )
}
