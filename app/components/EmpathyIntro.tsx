import Image from 'next/image'

export default function EmpathyIntro() {
  return (
    <section className="py-20 bg-gradient-to-b from-brand-gray/30 to-white">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Image - 40% width on desktop, full width on mobile */}
                     <div className="w-full lg:w-2/5">
             <div className="relative h-80 lg:h-auto lg:min-h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                             <Image
                 src="/pic-001.png"
                 alt="Business owner working with marketing team"
                 fill
                 className="object-cover"
               />
              {/* Subtle overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
          </div>

          {/* Text Content - 60% width on desktop, full width on mobile */}
          <div className="w-full lg:w-3/5 space-y-8">
            {/* Section Title */}
            <div>
                             <h2 className="text-3xl lg:text-5xl xl:text-6xl font-extrabold text-brand-blue leading-tight">
                 You Run the Business.<br />
                 <span className="text-brand-orange">We Drive the Growth.</span>
               </h2>
            </div>

            {/* Body Text */}
            <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
              <p>
                Running a business means wearing many hats — serving customers, managing operations, and keeping finances on track.
                Growth takes time, planning, and expertise, and it's perfectly normal not to have the bandwidth for it all.
              </p>
              
              <p>
                That's where we come in. At North Via Marketing, we work with you to plan, execute, and optimize the steps that bring more customers, build loyalty, and strengthen your brand — all while keeping your budget in check.
              </p>
              
              <p>
                With our marketing expertise and North Via Tech's smart digital solutions, we make the growth journey faster, smoother, and more powerful.
              </p>
            </div>

            {/* CTA Button */}
            <div className="pt-4">
              <a 
                href="/services" 
                className="inline-flex items-center text-brand-orange font-semibold text-lg hover:text-orange-600 transition-colors duration-300 group"
              >
                Discover Our Services
                <svg 
                  className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
