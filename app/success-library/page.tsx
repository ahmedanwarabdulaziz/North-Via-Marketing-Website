import SuccessStats from './components/SuccessStats'
import ProjectSnapshots from './components/ProjectSnapshots'
import SuccessInsights from './components/SuccessInsights'
import { successStats, projectSnapshots, successInsights } from './data/successData'
import Image from 'next/image'

export default function SuccessLibraryPage() {
  return (
    <div>
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-[#274290] via-[#274290] to-[#f27921] overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0">
          {/* Gradient Overlay for text readability - transparent at top on mobile, stronger on left */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#274290]/40 to-[#274290]/60 lg:from-[#274290]/90 lg:via-[#274290]/80 lg:to-[#274290]/90"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/60 via-[#274290]/30 to-transparent lg:from-[#274290]/80 lg:via-[#274290]/60 lg:to-[#f27921]/80"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[600px]">
            {/* Left Column - Content */}
            <div className="text-left">
              <h1 className="text-5xl lg:text-7xl xl:text-8xl font-black text-white leading-tight mb-8">
                Success
                <span className="block text-[#f27921]">Library</span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-8">
                Real results from real businesses. See how we've helped companies across Ontario achieve measurable growth.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6">
                <a 
                  href="#case-studies" 
                  className="inline-flex items-center gap-2 bg-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#d6681a] transition-all duration-300 group shadow-lg hover:shadow-xl"
                >
                  View Case Studies
                </a>
                <a 
                  href="/services" 
                  className="inline-flex items-center gap-2 border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 group"
                >
                  Our Services
                </a>
              </div>
            </div>
            
            {/* Right Column - Empty for balance */}
            <div className="hidden lg:block"></div>
          </div>
        </div>
      </section>

      <SuccessStats stats={successStats} />
      <ProjectSnapshots snapshots={projectSnapshots} />
      <SuccessInsights insights={successInsights} />
      
      {/* CTA Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
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
                <h2 className="text-3xl lg:text-4xl font-black mb-8">
                  Ready to Write Your Success Story?
                </h2>
                
                <p className="text-xl leading-relaxed mb-12 opacity-90 max-w-2xl mx-auto">
                  Let's discuss how we can help your business achieve similar results.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a 
                    href="/contact" 
                    className="bg-white text-[#274290] px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-lg hover:shadow-xl"
                  >
                    Book a Discovery Call
                  </a>
                  <a 
                    href="/services" 
                    className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
                  >
                    View Our Services
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}