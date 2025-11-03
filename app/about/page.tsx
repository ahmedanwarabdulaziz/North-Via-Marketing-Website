import Image from 'next/image'
import { Award, Target, Users, ArrowRight, Clock, Heart } from 'lucide-react'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Company */}
      <section className="relative py-20 md:py-32 bg-gradient-to-br from-[#274290] to-[#f27921] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          {/* Desktop Image */}
          <div className="hidden md:block absolute inset-0">
            <Image
              src="/a043.png"
              alt="North Via Marketing"
              fill
              className="object-cover object-center"
              priority
            />
          </div>
          {/* Mobile Image */}
          <div className="md:hidden absolute inset-0">
            <Image
              src="/a044.png"
              alt="North Via Marketing"
              fill
              className="object-cover object-center"
              priority
            />
          </div>
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#274290]/80 via-[#274290]/60 to-[#f27921]/80"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight mb-6">
              About North Via Marketing
            </h1>
            <p className="text-xl md:text-2xl text-white/90 leading-relaxed max-w-3xl mx-auto">
              Strategic digital marketing solutions that drive measurable results. Partner with us to grow faster, smarter, and stronger.
            </p>
          </div>
        </div>
      </section>

      {/* Company Overview Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8 text-gray-700 leading-relaxed">
              <p className="text-lg md:text-xl">
                We are a passionate team of digital marketing experts dedicated to helping businesses achieve their growth goals through strategic, data-driven marketing solutions.
              </p>
              
              <p className="text-lg md:text-xl">
                Founded with a vision to transform how businesses approach digital marketing, North Via Marketing combines creativity with analytics to deliver measurable results. Our comprehensive approach ensures that every marketing dollar spent contributes to your business growth.
              </p>
              
              <p className="text-lg md:text-xl">
                We believe in building long-term partnerships with our clients, understanding their unique challenges, and creating customized strategies that drive sustainable growth and competitive advantage.
              </p>
            </div>

            {/* Key Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
              <div className="bg-gradient-to-br from-[#274290]/5 to-[#f27921]/5 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="text-white" size={32} />
                </div>
                <div className="text-3xl font-black text-[#274290] mb-2">10+</div>
                <div className="text-sm font-semibold text-gray-600">Years Experience</div>
              </div>
              
              <div className="bg-gradient-to-br from-[#274290]/5 to-[#f27921]/5 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="text-white" size={32} />
                </div>
                <div className="text-3xl font-black text-[#274290] mb-2">500+</div>
                <div className="text-sm font-semibold text-gray-600">Happy Clients</div>
              </div>
              
              <div className="bg-gradient-to-br from-[#274290]/5 to-[#f27921]/5 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="text-white" size={32} />
                </div>
                <div className="text-3xl font-black text-[#274290] mb-2">95%</div>
                <div className="text-sm font-semibold text-gray-600">Success Rate</div>
              </div>
              
              <div className="bg-gradient-to-br from-[#274290]/5 to-[#f27921]/5 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#274290] to-[#f27921] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="text-white" size={32} />
                </div>
                <div className="text-3xl font-black text-[#274290] mb-2">24/7</div>
                <div className="text-sm font-semibold text-gray-600">Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Values Section */}
      <section className="py-16 md:py-24 bg-[#e6e7e8]/30">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Mission Statement */}
              <div className="bg-white rounded-2xl p-8 shadow-xl">
                <div className="border-l-4 border-[#f27921] pl-6">
                  <h2 className="text-3xl font-black text-[#274290] mb-4 flex items-center gap-3">
                    <Target className="text-[#f27921]" size={32} />
                    Our Mission
                  </h2>
                  <p className="text-lg text-gray-700 leading-relaxed">
                    To empower businesses with innovative digital marketing strategies that drive sustainable growth and deliver exceptional ROI through data-driven insights and creative excellence.
                  </p>
                </div>
              </div>

              {/* Values */}
              <div className="bg-white rounded-2xl p-8 shadow-xl">
                <h2 className="text-3xl font-black text-[#274290] mb-6 flex items-center gap-3">
                  <Heart className="text-[#f27921]" size={32} />
                  Our Values
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-[#f27921] rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-bold text-[#274290]">Innovation</div>
                      <div className="text-sm text-gray-600">Staying ahead with cutting-edge strategies</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-[#f27921] rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-bold text-[#274290]">Transparency</div>
                      <div className="text-sm text-gray-600">Clear communication and honest reporting</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-[#f27921] rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-bold text-[#274290]">Results-Driven</div>
                      <div className="text-sm text-gray-600">Focus on measurable outcomes and ROI</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-[#f27921] rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-bold text-[#274290]">Partnership</div>
                      <div className="text-sm text-gray-600">Building long-term client relationships</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#274290] to-[#f27921]">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-6">
              Ready to Grow Your Business?
            </h2>
            <p className="text-xl md:text-2xl text-white/90 leading-relaxed mb-10 max-w-2xl mx-auto">
              Let's discuss how our strategic approach can transform your business growth and create lasting results.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/#contact"
                className="bg-white text-[#274290] px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all duration-300 flex items-center justify-center group shadow-xl hover:shadow-2xl"
              >
                Schedule a Consultation
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
              </Link>
              <Link
                href="/survey"
                className="bg-white/10 backdrop-blur-sm border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center group"
              >
                Get Your Free Assessment
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

