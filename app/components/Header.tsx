'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <header className="sticky top-0 bg-gradient-to-r from-[#f27921] via-orange-500 to-[#f27921] text-white shadow-lg z-[9999]">
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10"></div>
      <div className="relative z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <Image
                src="/Logo-1.png"
                alt="North Via Marketing Logo"
                width={50}
                height={50}
                className="object-contain"
              />
              <div className="text-2xl font-bold text-[#274290] font-serif">
                North Via Marketing
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex space-x-8">
              <a 
                href="/" 
                className="text-[#274290] font-medium hover:text-white transition-colors duration-300"
              >
                Home
              </a>
              <a 
                href="/success-library" 
                className="text-[#274290] font-medium hover:text-white transition-colors duration-300"
              >
                Success Library
              </a>
              <div className="relative group">
                <a 
                  href="/services" 
                  className="text-[#274290] font-medium hover:text-white transition-colors duration-300"
                >
                  Services
                </a>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-[1400px] max-w-[95vw] bg-white rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[9999] border border-gray-200 overflow-hidden">
                  <a 
                    href="/services" 
                    className="block px-6 py-4 text-[#274290] hover:bg-gradient-to-r hover:from-[#274290] hover:to-[#f27921] hover:text-white transition-all duration-300 font-bold text-lg border-b-2 border-gray-100"
                  >
                    All Services
                  </a>
                  
                  {/* Professional Three Column Layout */}
                  <div className="flex">
                    {/* Column 1: Be Seen. Be Remembered. */}
                    <div className="flex-1 border-r border-gray-100">
                      <div className="px-6 py-4 bg-gray-50 text-sm font-semibold text-[#274290] border-b border-gray-200">
                        Be Seen. Be Remembered.
                      </div>
                      <div className="py-2">
                        <a 
                          href="/services/social-media-management" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-gray-50 hover:text-[#f27921] transition-all duration-200 font-medium"
                        >
                          Social Media Management
                        </a>
                        <a 
                          href="/services/google-social-media-ads" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-gray-50 hover:text-[#f27921] transition-all duration-200 font-medium"
                        >
                          Google & Social Media Ads
                        </a>
                        <a 
                          href="/services/seo-services" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-gray-50 hover:text-[#f27921] transition-all duration-200 font-medium"
                        >
                          SEO Services
                        </a>
                        <a 
                          href="/services/custom-design-services" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-gray-50 hover:text-[#f27921] transition-all duration-200 font-medium"
                        >
                          Custom Design Services
                        </a>
                      </div>
                    </div>

                    {/* Column 2: Keep Everything Running Smoothly. */}
                    <div className="flex-1 border-r border-gray-100">
                      <div className="px-6 py-4 bg-gray-50 text-sm font-semibold text-[#274290] border-b border-gray-200">
                        Keep Everything Running Smoothly.
                      </div>
                      <div className="py-2">
                        <a 
                          href="/services/website-updates-maintenance" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-gray-50 hover:text-[#f27921] transition-all duration-200 font-medium"
                        >
                          Website Updates & Maintenance
                        </a>
                        <a 
                          href="/services/crm-setup-automation" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-gray-50 hover:text-[#f27921] transition-all duration-200 font-medium"
                        >
                          CRM Setup & Automation
                        </a>
                        <a 
                          href="/services/monthly-report-strategy-call" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-gray-50 hover:text-[#f27921] transition-all duration-200 font-medium"
                        >
                          Monthly Report & Strategy Call
                        </a>
                        <a 
                          href="/services/email-support" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-gray-50 hover:text-[#f27921] transition-all duration-200 font-medium"
                        >
                          Email Support
                        </a>
                        <a 
                          href="/services/priority-support" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-gray-50 hover:text-[#f27921] transition-all duration-200 font-medium"
                        >
                          Priority Support
                        </a>
                      </div>
                    </div>

                    {/* Column 3: Work With a Partner Who Thinks Beyond Ads. */}
                    <div className="flex-1">
                      <div className="px-6 py-4 bg-gray-50 text-sm font-semibold text-[#274290] border-b border-gray-200">
                        Work With a Partner Who Thinks Beyond Ads.
                      </div>
                      <div className="py-2">
                        <a 
                          href="/services/basic-business-process-review" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-gray-50 hover:text-[#f27921] transition-all duration-200 font-medium"
                        >
                          Basic Business Process Review
                        </a>
                        <a 
                          href="/services/customer-experience-suggestions" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-gray-50 hover:text-[#f27921] transition-all duration-200 font-medium"
                        >
                          Customer Experience Suggestions
                        </a>
                        <a 
                          href="/services/bi-weekly-strategy-calls" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-gray-50 hover:text-[#f27921] transition-all duration-200 font-medium"
                        >
                          Bi-Weekly Strategy Calls
                        </a>
                        <a 
                          href="/services/staff-onboarding-support" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-gray-50 hover:text-[#f27921] transition-all duration-200 font-medium"
                        >
                          Staff Onboarding Support
                        </a>
                        <a 
                          href="/services/unlimited-marketing-consulting" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-gray-50 hover:text-[#f27921] transition-all duration-200 font-medium"
                        >
                          Unlimited Marketing Consulting
                        </a>
                        <a 
                          href="/services/full-business-process-audit" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-gray-50 hover:text-[#f27921] transition-all duration-200 font-medium"
                        >
                          Full Business Process Audit
                        </a>
                        <a 
                          href="/services/quarterly-business-health-deep-dive" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-gray-50 hover:text-[#f27921] transition-all duration-200 font-medium"
                        >
                          Quarterly Business Health Deep-Dive
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Additional Resources */}
                  <div className="border-t border-gray-200 bg-gray-50">
                    <a 
                      href="/seo-approach" 
                      className="block px-6 py-4 text-[#274290] hover:bg-gradient-to-r hover:from-[#274290] hover:to-[#f27921] hover:text-white transition-all duration-300 font-medium"
                    >
                      Our SEO Approach
                    </a>
                  </div>
                </div>
              </div>
              <a 
                href="#about" 
                className="text-[#274290] font-medium hover:text-white transition-colors duration-300"
              >
                About
              </a>
              <a 
                href="#contact" 
                className="text-[#274290] font-medium hover:text-white transition-colors duration-300"
              >
                Contact
              </a>
            </nav>

            {/* CTA Button */}
            <div className="hidden md:block">
              <a 
                href="#contact" 
                className="bg-[#274290] text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-800 transition-colors duration-300"
              >
                Get Started
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className="md:hidden text-[#274290] hover:text-white transition-colors duration-300"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 pb-4">
              <nav className="flex flex-col space-y-4">
                <a 
                  href="/" 
                  className="text-[#274290] font-medium hover:text-white transition-colors duration-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </a>
                <a 
                  href="/success-library" 
                  className="text-[#274290] font-medium hover:text-white transition-colors duration-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Success Library
                </a>
                <a 
                  href="/services" 
                  className="text-[#274290] font-medium hover:text-white transition-colors duration-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Services
                </a>
                <a 
                  href="/services" 
                  className="text-[#274290] font-semibold hover:text-white transition-colors duration-300 pl-4"
                  onClick={() => setIsMenuOpen(false)}
                >
                  All Services
                </a>
                
                {/* Be Seen. Be Remembered. */}
                <div className="pl-4">
                  <div className="text-sm font-semibold text-[#274290] mb-2">
                    Be Seen. Be Remembered.
                  </div>
                  <a 
                    href="/services/social-media-management" 
                    className="block text-sm text-[#274290] hover:text-white transition-colors duration-300 pl-4 mb-1"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Social Media Management
                  </a>
                  <a 
                    href="/services/google-social-media-ads" 
                    className="block text-sm text-[#274290] hover:text-white transition-colors duration-300 pl-4 mb-1"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Google & Social Media Ads
                  </a>
                  <a 
                    href="/services/seo-services" 
                    className="block text-sm text-[#274290] hover:text-white transition-colors duration-300 pl-4 mb-1"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    SEO Services
                  </a>
                  <a 
                    href="/services/custom-design-services" 
                    className="block text-sm text-[#274290] hover:text-white transition-colors duration-300 pl-4 mb-3"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Custom Design Services
                  </a>
                </div>

                {/* Keep Everything Running Smoothly. */}
                <div className="pl-4">
                  <div className="text-sm font-semibold text-[#274290] mb-2">
                    Keep Everything Running Smoothly.
                  </div>
                  <a 
                    href="/services/website-updates-maintenance" 
                    className="block text-sm text-[#274290] hover:text-white transition-colors duration-300 pl-4 mb-1"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Website Updates & Maintenance
                  </a>
                  <a 
                    href="/services/crm-setup-automation" 
                    className="block text-sm text-[#274290] hover:text-white transition-colors duration-300 pl-4 mb-1"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    CRM Setup & Automation
                  </a>
                  <a 
                    href="/services/monthly-report-strategy-call" 
                    className="block text-sm text-[#274290] hover:text-white transition-colors duration-300 pl-4 mb-1"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Monthly Report & Strategy Call
                  </a>
                  <a 
                    href="/services/email-support" 
                    className="block text-sm text-[#274290] hover:text-white transition-colors duration-300 pl-4 mb-1"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Email Support
                  </a>
                  <a 
                    href="/services/priority-support" 
                    className="block text-sm text-[#274290] hover:text-white transition-colors duration-300 pl-4 mb-3"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Priority Support
                  </a>
                </div>

                {/* Work With a Partner Who Thinks Beyond Ads. */}
                <div className="pl-4">
                  <div className="text-sm font-semibold text-[#274290] mb-2">
                    Work With a Partner Who Thinks Beyond Ads.
                  </div>
                  <a 
                    href="/services/basic-business-process-review" 
                    className="block text-sm text-[#274290] hover:text-white transition-colors duration-300 pl-4 mb-1"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Basic Business Process Review
                  </a>
                  <a 
                    href="/services/customer-experience-suggestions" 
                    className="block text-sm text-[#274290] hover:text-white transition-colors duration-300 pl-4 mb-1"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Customer Experience Suggestions
                  </a>
                  <a 
                    href="/services/bi-weekly-strategy-calls" 
                    className="block text-sm text-[#274290] hover:text-white transition-colors duration-300 pl-4 mb-1"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Bi-Weekly Strategy Calls
                  </a>
                  <a 
                    href="/services/staff-onboarding-support" 
                    className="block text-sm text-[#274290] hover:text-white transition-colors duration-300 pl-4 mb-1"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Staff Onboarding Support
                  </a>
                  <a 
                    href="/services/unlimited-marketing-consulting" 
                    className="block text-sm text-[#274290] hover:text-white transition-colors duration-300 pl-4 mb-1"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Unlimited Marketing Consulting
                  </a>
                  <a 
                    href="/services/full-business-process-audit" 
                    className="block text-sm text-[#274290] hover:text-white transition-colors duration-300 pl-4 mb-1"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Full Business Process Audit
                  </a>
                  <a 
                    href="/services/quarterly-business-health-deep-dive" 
                    className="block text-sm text-[#274290] hover:text-white transition-colors duration-300 pl-4 mb-3"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Quarterly Business Health Deep-Dive
                  </a>
                </div>

                {/* Additional Resources */}
                <a 
                  href="/seo-approach" 
                  className="text-[#274290] font-medium hover:text-white transition-colors duration-300 pl-4"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Our SEO Approach
                </a>
                <a 
                  href="#about" 
                  className="text-[#274290] font-medium hover:text-white transition-colors duration-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  About
                </a>
                <a 
                  href="#contact" 
                  className="text-[#274290] font-medium hover:text-white transition-colors duration-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Contact
                </a>
                <a 
                  href="#contact" 
                  className="bg-[#274290] text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-800 transition-colors duration-300 inline-block w-fit"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Get Started
                </a>
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
