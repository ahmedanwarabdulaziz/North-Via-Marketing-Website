import SuccessStats from './components/SuccessStats'
import ProjectSnapshots from './components/ProjectSnapshots'
import SuccessInsights from './components/SuccessInsights'
import { successStats, projectSnapshots, successInsights } from './data/successData'

export default function SuccessLibraryPage() {
  return (
    <div>
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#274290] via-[#f27921] to-[#274290] opacity-90"></div>
        <div className="relative z-10 text-center text-white px-6">
          <h1 className="text-4xl lg:text-6xl xl:text-7xl font-black leading-tight mb-8">
            <span className="block">Success</span>
            <span className="block text-[#f27921]">Library</span>
          </h1>
          
          <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-8 max-w-4xl mx-auto">
            Real results from real businesses. See how we've helped companies across Ontario achieve measurable growth.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a 
              href="#case-studies" 
              className="bg-white text-[#274290] px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group"
            >
              View Case Studies
            </a>
            <a 
              href="/services" 
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 flex items-center justify-center group"
            >
              Our Services
            </a>
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
            <div className="bg-gradient-to-r from-[#274290] to-[#f27921] rounded-2xl p-12 text-white">
              <h2 className="text-3xl lg:text-4xl font-black mb-8">
                Ready to Write Your Success Story?
              </h2>
              
              <p className="text-xl leading-relaxed mb-12">
                Let's discuss how we can help your business achieve similar results.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="https://calendly.com/northviamarketing" 
                  target="_blank"
                  rel="noopener noreferrer"
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
      </section>
    </div>
  )
}