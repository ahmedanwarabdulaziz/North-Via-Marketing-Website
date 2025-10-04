import { Award, Clock, Users, Target } from 'lucide-react'

export default function About() {
  return (
    <section id="about" className="py-20 bg-brand-gray/30">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold text-brand-blue font-serif">
                About NVM Marketing
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                We are a passionate team of digital marketing experts dedicated to helping 
                businesses achieve their growth goals through strategic, data-driven marketing solutions.
              </p>
            </div>

            <div className="space-y-6">
              <p className="text-gray-700 leading-relaxed">
                Founded with a vision to transform how businesses approach digital marketing, 
                NVM Marketing combines creativity with analytics to deliver measurable results. 
                Our comprehensive approach ensures that every marketing dollar spent contributes 
                to your business growth.
              </p>
              
              <p className="text-gray-700 leading-relaxed">
                We believe in building long-term partnerships with our clients, understanding 
                their unique challenges, and creating customized strategies that drive sustainable 
                growth and competitive advantage.
              </p>
            </div>

            {/* Key Highlights */}
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-brand-orange/10 rounded-lg flex items-center justify-center">
                  <Award className="text-brand-orange" size={24} />
                </div>
                <div>
                  <div className="font-semibold text-brand-blue">10+ Years</div>
                  <div className="text-sm text-gray-600">Industry Experience</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-brand-orange/10 rounded-lg flex items-center justify-center">
                  <Users className="text-brand-orange" size={24} />
                </div>
                <div>
                  <div className="font-semibold text-brand-blue">500+</div>
                  <div className="text-sm text-gray-600">Happy Clients</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-brand-orange/10 rounded-lg flex items-center justify-center">
                  <Target className="text-brand-orange" size={24} />
                </div>
                <div>
                  <div className="font-semibold text-brand-blue">95%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-brand-orange/10 rounded-lg flex items-center justify-center">
                  <Clock className="text-brand-orange" size={24} />
                </div>
                <div>
                  <div className="font-semibold text-brand-blue">24/7</div>
                  <div className="text-sm text-gray-600">Support Available</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Visual Element */}
          <div className="relative">
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <div className="space-y-6">
                {/* Mission Statement */}
                <div className="border-l-4 border-brand-orange pl-6">
                  <h3 className="text-2xl font-bold text-brand-blue mb-3">Our Mission</h3>
                  <p className="text-gray-700 leading-relaxed">
                    To empower businesses with innovative digital marketing strategies that drive 
                    sustainable growth and deliver exceptional ROI through data-driven insights 
                    and creative excellence.
                  </p>
                </div>

                {/* Values */}
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-brand-blue">Our Values</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-3 h-3 bg-brand-orange rounded-full mt-2"></div>
                      <div>
                        <div className="font-semibold text-brand-blue">Innovation</div>
                        <div className="text-sm text-gray-600">Staying ahead with cutting-edge strategies</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-3 h-3 bg-brand-orange rounded-full mt-2"></div>
                      <div>
                        <div className="font-semibold text-brand-blue">Transparency</div>
                        <div className="text-sm text-gray-600">Clear communication and honest reporting</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-3 h-3 bg-brand-orange rounded-full mt-2"></div>
                      <div>
                        <div className="font-semibold text-brand-blue">Results-Driven</div>
                        <div className="text-sm text-gray-600">Focus on measurable outcomes and ROI</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-3 h-3 bg-brand-orange rounded-full mt-2"></div>
                      <div>
                        <div className="font-semibold text-brand-blue">Partnership</div>
                        <div className="text-sm text-gray-600">Building long-term client relationships</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
