import { ArrowRight } from 'lucide-react'

interface SuccessStatsProps {
  stats: Array<{
    number: string
    label: string
  }>
}

export default function SuccessStats({ stats }: SuccessStatsProps) {
  return (
    <section className="py-16 bg-gradient-to-r from-[#274290] to-[#f27921] text-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-black mb-4">
            Our Track Record
          </h2>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Real results from real businesses. Here's what we've achieved together.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <div key={index} className="text-center flex flex-col items-center justify-center">
              <div className="text-4xl lg:text-5xl font-black text-white mb-2 text-center">
                {stat.number}
              </div>
              <div className="text-lg text-white/80 text-center">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <a 
            href="#case-studies" 
            className="inline-flex items-center gap-2 bg-white text-[#274290] px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 group"
          >
            See Detailed Case Studies
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </a>
        </div>
      </div>
    </section>
  )
}
