import { Check, ArrowRight } from 'lucide-react'

export default function Services() {
  return (
    <section id="services" className="py-20 bg-white">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-brand-blue leading-tight mb-6">
            Choose the Partnership That Fits Your Growth Stage
          </h2>
          <p className="text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
            Every business is unique — and so is the level of support you need. Whether you're just getting started, ready to accelerate, or aiming for long-term dominance, we have a package designed to work with you and deliver measurable results.
          </p>
        </div>

                 {/* Package Cards */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {/* Essential Growth */}
           <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-8 border border-gray-100 flex flex-col">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-brand-blue mb-4">
                Essential Growth
              </h3>
              <p className="text-gray-600 mb-6">
                Build a strong marketing foundation and keep your online presence sharp.
              </p>
              <div className="text-4xl font-bold text-brand-orange mb-2">
                $200
              </div>
              <div className="text-gray-500">CAD / month</div>
            </div>

            <div className="space-y-4 mb-8 flex-grow">
              <h4 className="font-semibold text-brand-blue mb-4">Includes:</h4>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Social Media Management</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Website Updates & Maintenance</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Monthly Report & Strategy Call</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Basic Business Process Review</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Email Support</span>
                </li>
              </ul>
            </div>

            <a 
              href="#contact" 
              className="w-full bg-brand-orange text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-600 transition-colors duration-300 flex items-center justify-center group"
            >
              Get Started
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </a>
          </div>

          {/* Performance Partner */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-8 border border-gray-100 flex flex-col">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-brand-blue mb-4">
                Performance Partner
              </h3>
              <p className="text-gray-600 mb-6">
                Boost visibility, improve processes, and start scaling faster.
              </p>
              <div className="text-4xl font-bold text-brand-orange mb-2">
                $400
              </div>
              <div className="text-gray-500">CAD / month</div>
            </div>

            <div className="space-y-4 mb-8 flex-grow">
              <h4 className="font-semibold text-brand-blue mb-4">Includes:</h4>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Everything in Essential Growth</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Google & Social Media Ads Management</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">CRM Setup & Automation (powered by North Via Tech)</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Customer Experience Improvement Suggestions</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Bi-weekly Strategy Calls</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Staff Onboarding Support</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Custom Design Services</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">SEO Services</span>
                </li>
              </ul>
            </div>

            <a 
              href="#contact" 
              className="w-full bg-brand-orange text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-600 transition-colors duration-300 flex items-center justify-center group"
            >
              Get Started
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </a>
          </div>

          {/* Strategic Partner */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 p-8 border border-gray-100 relative flex flex-col">
            {/* Limited-Time Offer Box */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-brand-orange text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
              💡 Limited-Time Offer
            </div>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-brand-blue mb-4">
                Strategic Partner
              </h3>
              <p className="text-gray-600 mb-6">
                A fully integrated partnership for ambitious, long-term growth.
              </p>
              <div className="text-4xl font-bold text-brand-orange mb-2">
                $700
              </div>
              <div className="text-gray-500">CAD / month</div>
            </div>

            <div className="space-y-4 mb-8 flex-grow">
              <h4 className="font-semibold text-brand-blue mb-4">Includes:</h4>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Everything in Performance Partner</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Unlimited Marketing Consulting</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Full Business Process Audit</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Priority Support</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Advanced SEO Services</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-brand-orange mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Quarterly Business Health Deep-Dive</span>
                </li>
              </ul>
            </div>

            {/* Limited-Time Offer Details */}
            <div className="bg-brand-orange text-white p-4 rounded-lg mb-6">
              <p className="text-sm font-semibold mb-1">
                Try our Strategic Partner package for your first 3 months at just $400/month (regularly $700).
              </p>
              <p className="text-xs opacity-90">
                Experience the full power of a dedicated growth team — risk-free.
              </p>
            </div>

            <a 
              href="#contact" 
              className="w-full bg-brand-orange text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-600 transition-colors duration-300 flex items-center justify-center group"
            >
              Get Started
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
