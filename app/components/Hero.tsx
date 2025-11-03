import { Calendar, Eye, ClipboardCheck } from 'lucide-react'
import Image from 'next/image'

export default function Hero() {
  return (
    <section id="home" className="relative min-h-screen bg-gradient-to-br from-[#274290] to-[#f27921] overflow-hidden">
      {/* Background Images */}
      <div className="absolute inset-0">
        {/* Desktop Image */}
        <div className="hidden lg:block absolute inset-0">
          <Image
            src="/Hero-01.png"
            alt="Business growth and marketing"
            fill
            className="object-cover"
            priority
          />
        </div>
        
        {/* Mobile Image */}
        <div className="lg:hidden absolute inset-0">
          <Image
            src="/Hero-02.png"
            alt="Business growth and marketing"
            fill
            className="object-cover"
            priority
          />
        </div>
        
        {/* Full Background Gradient Overlay - Using brand colors */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/60 via-[#274290]/40 to-[#f27921]/60"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Text Content - Left Column */}
          <div className="w-full lg:w-3/5 text-center lg:text-left">
            <h1 className="text-5xl lg:text-7xl xl:text-8xl font-black text-white leading-tight mb-8">
              <span className="block tracking-widest">Together</span>
              <span className="block">We Grow Your</span>
              <span className="block text-[#f27921]">Business</span>
              <span className="block text-3xl lg:text-4xl xl:text-5xl mt-4 text-[#e6e7e8]">
                Fast<span className="text-[#f27921]">er</span>, Smart<span className="text-[#f27921]">er</span>, Strong<span className="text-[#f27921]">er</span>
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-white/90 leading-relaxed mb-8 max-w-2xl lg:max-w-none">
              From vision to measurable results, we work shoulder-to-shoulder with you to grow faster, smarter, and stronger.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a 
                href="#contact" 
                className="bg-[#f27921] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#d6681a] transition-all duration-300 flex items-center justify-center group shadow-lg hover:shadow-xl"
              >
                Book a Free Consultation
                <Calendar className="ml-2 group-hover:scale-110 transition-transform duration-300" size={20} />
              </a>
              <a 
                href="/survey" 
                className="bg-white text-[#274290] px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-lg hover:shadow-xl"
              >
                Get Your Free Business Assessment
                <ClipboardCheck className="ml-2 group-hover:scale-110 transition-transform duration-300" size={20} />
              </a>
              <a 
                href="/success-library" 
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-[#274290] transition-all duration-300 text-center flex items-center justify-center group"
              >
                Success Stories
                <Eye className="ml-2 group-hover:scale-110 transition-transform duration-300" size={20} />
              </a>
            </div>

            {/* Micro-trust line */}
            <div className="pt-6">
              <p className="text-sm text-white/80 italic">
                Trusted by clinics, automotive detailers, upholstery shops, restaurants, and wellness brands.
              </p>
            </div>

            {/* Discreet Tech Credit */}
            <div className="pt-2">
              <p className="text-xs text-white/60">
                Tech solutions in collaboration with North Via Tech
              </p>
            </div>
          </div>

          {/* Right Column - Shows background image through gradient */}
          <div className="hidden lg:block w-full lg:w-2/5">
            {/* This space allows the background image to show through the gradient */}
            <div className="h-96 lg:h-auto lg:min-h-[600px]"></div>
          </div>
        </div>
      </div>
    </section>
  )
}
