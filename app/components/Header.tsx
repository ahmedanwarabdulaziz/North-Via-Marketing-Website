'use client'

import { useState } from 'react'
import { Menu, X, ChevronDown, ChevronRight, Search, Settings, Users, Wrench, Clock, Shield, MessageSquare, Brain, TrendingUp, Target, Share2, BarChart, FileSearch, Palette } from 'lucide-react'
import Image from 'next/image'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>([])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
    // Reset expanded sections when menu closes
    if (isMenuOpen) {
      setExpandedSections([])
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
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
                    {/* Column 1: Get Found by More Customers */}
                    <div className="flex-1 border-r border-gray-100">
                      <div className="px-6 py-4 bg-gradient-to-r from-[#274290] to-[#f27921] text-white text-sm font-bold border-b-2 border-[#f27921] shadow-lg">
                        <div className="flex items-center gap-2">
                          <Search size={18} className="flex-shrink-0" />
                          <span>Get Found by More Customers</span>
                        </div>
                      </div>
                      <div className="py-2 bg-orange-50/30">
                        <a 
                          href="/services/social-media-management" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-orange-50 hover:text-[#f27921] transition-all duration-200 font-medium flex items-center gap-2 group"
                        >
                          <Share2 size={16} className="text-[#f27921] group-hover:text-[#d6681a] flex-shrink-0" />
                          Social Media Management
                        </a>
                        <a 
                          href="/services/google-social-media-ads" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-orange-50 hover:text-[#f27921] transition-all duration-200 font-medium flex items-center gap-2 group"
                        >
                          <BarChart size={16} className="text-[#f27921] group-hover:text-[#d6681a] flex-shrink-0" />
                          Google & Social Media Ads
                        </a>
                        <a 
                          href="/services/seo-services" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-orange-50 hover:text-[#f27921] transition-all duration-200 font-medium flex items-center gap-2 group"
                        >
                          <FileSearch size={16} className="text-[#f27921] group-hover:text-[#d6681a] flex-shrink-0" />
                          SEO Services
                        </a>
                        <a 
                          href="/services/custom-design-services" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-orange-50 hover:text-[#f27921] transition-all duration-200 font-medium flex items-center gap-2 group"
                        >
                          <Palette size={16} className="text-[#f27921] group-hover:text-[#d6681a] flex-shrink-0" />
                          Custom Design Services
                        </a>
                      </div>
                    </div>

                    {/* Column 2: Keep Everything Running Smoothly. */}
                    <div className="flex-1 border-r border-gray-100">
                      <div className="px-6 py-4 bg-gradient-to-r from-[#274290] to-[#f27921] text-white text-sm font-bold border-b-2 border-[#f27921] shadow-lg">
                        <div className="flex items-center gap-2">
                          <Settings size={18} className="flex-shrink-0" />
                          <span>Keep Everything Running Smoothly.</span>
                        </div>
                      </div>
                      <div className="py-2 bg-orange-50/30">
                        <a 
                          href="/services/website-updates-maintenance" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-orange-50 hover:text-[#f27921] transition-all duration-200 font-medium flex items-center gap-2 group"
                        >
                          <Wrench size={16} className="text-[#f27921] group-hover:text-[#d6681a] flex-shrink-0" />
                          Website Updates & Maintenance
                        </a>
                        <a 
                          href="/services/crm-setup-automation" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-orange-50 hover:text-[#f27921] transition-all duration-200 font-medium flex items-center gap-2 group"
                        >
                          <Settings size={16} className="text-[#f27921] group-hover:text-[#d6681a] flex-shrink-0" />
                          CRM Setup & Automation
                        </a>
                        <a 
                          href="/services/monthly-report-strategy-call" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-orange-50 hover:text-[#f27921] transition-all duration-200 font-medium flex items-center gap-2 group"
                        >
                          <Clock size={16} className="text-[#f27921] group-hover:text-[#d6681a] flex-shrink-0" />
                          Monthly Report & Strategy Call
                        </a>
                        <a 
                          href="/services/email-support" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-orange-50 hover:text-[#f27921] transition-all duration-200 font-medium flex items-center gap-2 group"
                        >
                          <MessageSquare size={16} className="text-[#f27921] group-hover:text-[#d6681a] flex-shrink-0" />
                          Email Support
                        </a>
                        <a 
                          href="/services/priority-support" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-orange-50 hover:text-[#f27921] transition-all duration-200 font-medium flex items-center gap-2 group"
                        >
                          <Shield size={16} className="text-[#f27921] group-hover:text-[#d6681a] flex-shrink-0" />
                          Priority Support
                        </a>
                      </div>
                    </div>

                    {/* Column 3: Work With a Partner Who Thinks Beyond Ads. */}
                    <div className="flex-1">
                      <div className="px-6 py-4 bg-gradient-to-r from-[#274290] to-[#f27921] text-white text-sm font-bold border-b-2 border-[#f27921] shadow-lg">
                        <div className="flex items-center gap-2">
                          <Users size={18} className="flex-shrink-0" />
                          <span>Work With a Partner Who Thinks Beyond Ads.</span>
                        </div>
                      </div>
                      <div className="py-2 bg-orange-50/30">
                        <a 
                          href="/services/basic-business-process-review" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-orange-50 hover:text-[#f27921] transition-all duration-200 font-medium flex items-center gap-2 group"
                        >
                          <Target size={16} className="text-[#f27921] group-hover:text-[#d6681a] flex-shrink-0" />
                          Basic Business Process Review
                        </a>
                        <a 
                          href="/services/customer-experience-suggestions" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-orange-50 hover:text-[#f27921] transition-all duration-200 font-medium flex items-center gap-2 group"
                        >
                          <MessageSquare size={16} className="text-[#f27921] group-hover:text-[#d6681a] flex-shrink-0" />
                          Customer Experience Suggestions
                        </a>
                        <a 
                          href="/services/bi-weekly-strategy-calls" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-orange-50 hover:text-[#f27921] transition-all duration-200 font-medium flex items-center gap-2 group"
                        >
                          <Clock size={16} className="text-[#f27921] group-hover:text-[#d6681a] flex-shrink-0" />
                          Bi-Weekly Strategy Calls
                        </a>
                        <a 
                          href="/services/staff-onboarding-support" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-orange-50 hover:text-[#f27921] transition-all duration-200 font-medium flex items-center gap-2 group"
                        >
                          <Users size={16} className="text-[#f27921] group-hover:text-[#d6681a] flex-shrink-0" />
                          Staff Onboarding Support
                        </a>
                        <a 
                          href="/services/unlimited-marketing-consulting" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-orange-50 hover:text-[#f27921] transition-all duration-200 font-medium flex items-center gap-2 group"
                        >
                          <Brain size={16} className="text-[#f27921] group-hover:text-[#d6681a] flex-shrink-0" />
                          Unlimited Marketing Consulting
                        </a>
                        <a 
                          href="/services/full-business-process-audit" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-orange-50 hover:text-[#f27921] transition-all duration-200 font-medium flex items-center gap-2 group"
                        >
                          <TrendingUp size={16} className="text-[#f27921] group-hover:text-[#d6681a] flex-shrink-0" />
                          Full Business Process Audit
                        </a>
                        <a 
                          href="/services/quarterly-business-health-deep-dive" 
                          className="block px-6 py-3 text-sm text-[#274290] hover:bg-orange-50 hover:text-[#f27921] transition-all duration-200 font-medium flex items-center gap-2 group"
                        >
                          <Target size={16} className="text-[#f27921] group-hover:text-[#d6681a] flex-shrink-0" />
                          Quarterly Business Health Deep-Dive
                        </a>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
              <a 
                href="/about" 
                className="text-[#274290] font-medium hover:text-white transition-colors duration-300"
              >
                About
              </a>
              <a 
                href="/about-ahmed" 
                className="text-[#274290] font-medium hover:text-white transition-colors duration-300"
              >
                About Ahmed
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
            <div className="md:hidden mt-4 pb-4 border-t border-white/20">
              <nav className="flex flex-col space-y-1 pt-4">
                <a 
                  href="/" 
                  className="text-[#274290] font-medium hover:text-white hover:bg-white/10 transition-all duration-300 px-4 py-2 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </a>
                <a 
                  href="/success-library" 
                  className="text-[#274290] font-medium hover:text-white hover:bg-white/10 transition-all duration-300 px-4 py-2 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Success Library
                </a>
                
                {/* Services Section */}
                <div className="space-y-1">
                  <a 
                    href="/services" 
                    className="text-[#274290] font-semibold hover:text-white hover:bg-white/10 transition-all duration-300 px-4 py-2 rounded-lg block"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    All Services
                  </a>
                  
                  {/* Get Found by More Customers */}
                  <div className="border-l-2 border-white/20 ml-4">
                    <button
                      onClick={() => toggleSection('be-seen')}
                      className="w-full flex items-center justify-between text-sm font-bold bg-gradient-to-r from-[#274290] to-[#f27921] text-white hover:from-[#1e3370] hover:to-[#d6681a] transition-all duration-300 px-4 py-3 rounded-lg shadow-md"
                    >
                      <span className="flex items-center gap-2">
                        <Search size={16} className="flex-shrink-0" />
                        Get Found by More Customers
                      </span>
                      {expandedSections.includes('be-seen') ? (
                        <ChevronDown size={18} className="flex-shrink-0" />
                      ) : (
                        <ChevronRight size={18} className="flex-shrink-0" />
                      )}
                    </button>
                    {expandedSections.includes('be-seen') && (
                      <div className="ml-4 mt-1 space-y-1 transition-all duration-200 ease-in-out bg-orange-50/20 rounded-lg">
                        <a 
                          href="/services/social-media-management" 
                          className="block text-sm text-[#274290] hover:text-[#f27921] hover:bg-orange-50/50 transition-all duration-300 px-4 py-2 rounded-lg flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Share2 size={16} className="text-[#f27921] flex-shrink-0" />
                          Social Media Management
                        </a>
                        <a 
                          href="/services/google-social-media-ads" 
                          className="block text-sm text-[#274290] hover:text-[#f27921] hover:bg-orange-50/50 transition-all duration-300 px-4 py-2 rounded-lg flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <BarChart size={16} className="text-[#f27921] flex-shrink-0" />
                          Google & Social Media Ads
                        </a>
                        <a 
                          href="/services/seo-services" 
                          className="block text-sm text-[#274290] hover:text-[#f27921] hover:bg-orange-50/50 transition-all duration-300 px-4 py-2 rounded-lg flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <FileSearch size={16} className="text-[#f27921] flex-shrink-0" />
                          SEO Services
                        </a>
                        <a 
                          href="/services/custom-design-services" 
                          className="block text-sm text-[#274290] hover:text-[#f27921] hover:bg-orange-50/50 transition-all duration-300 px-4 py-2 rounded-lg flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Palette size={16} className="text-[#f27921] flex-shrink-0" />
                          Custom Design Services
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Keep Everything Running Smoothly. */}
                  <div className="border-l-2 border-white/20 ml-4">
                    <button
                      onClick={() => toggleSection('keep-running')}
                      className="w-full flex items-center justify-between text-sm font-bold bg-gradient-to-r from-[#274290] to-[#f27921] text-white hover:from-[#1e3370] hover:to-[#d6681a] transition-all duration-300 px-4 py-3 rounded-lg shadow-md"
                    >
                      <span className="flex items-center gap-2">
                        <Settings size={16} className="flex-shrink-0" />
                        Keep Everything Running Smoothly.
                      </span>
                      {expandedSections.includes('keep-running') ? (
                        <ChevronDown size={18} className="flex-shrink-0" />
                      ) : (
                        <ChevronRight size={18} className="flex-shrink-0" />
                      )}
                    </button>
                    {expandedSections.includes('keep-running') && (
                      <div className="ml-4 mt-1 space-y-1 transition-all duration-200 ease-in-out bg-orange-50/20 rounded-lg">
                        <a 
                          href="/services/website-updates-maintenance" 
                          className="block text-sm text-[#274290] hover:text-[#f27921] hover:bg-orange-50/50 transition-all duration-300 px-4 py-2 rounded-lg flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Wrench size={16} className="text-[#f27921] flex-shrink-0" />
                          Website Updates & Maintenance
                        </a>
                        <a 
                          href="/services/crm-setup-automation" 
                          className="block text-sm text-[#274290] hover:text-[#f27921] hover:bg-orange-50/50 transition-all duration-300 px-4 py-2 rounded-lg flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Settings size={16} className="text-[#f27921] flex-shrink-0" />
                          CRM Setup & Automation
                        </a>
                        <a 
                          href="/services/monthly-report-strategy-call" 
                          className="block text-sm text-[#274290] hover:text-[#f27921] hover:bg-orange-50/50 transition-all duration-300 px-4 py-2 rounded-lg flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Clock size={16} className="text-[#f27921] flex-shrink-0" />
                          Monthly Report & Strategy Call
                        </a>
                        <a 
                          href="/services/email-support" 
                          className="block text-sm text-[#274290] hover:text-[#f27921] hover:bg-orange-50/50 transition-all duration-300 px-4 py-2 rounded-lg flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <MessageSquare size={16} className="text-[#f27921] flex-shrink-0" />
                          Email Support
                        </a>
                        <a 
                          href="/services/priority-support" 
                          className="block text-sm text-[#274290] hover:text-[#f27921] hover:bg-orange-50/50 transition-all duration-300 px-4 py-2 rounded-lg flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Shield size={16} className="text-[#f27921] flex-shrink-0" />
                          Priority Support
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Work With a Partner Who Thinks Beyond Ads. */}
                  <div className="border-l-2 border-white/20 ml-4">
                    <button
                      onClick={() => toggleSection('partner')}
                      className="w-full flex items-center justify-between text-sm font-bold bg-gradient-to-r from-[#274290] to-[#f27921] text-white hover:from-[#1e3370] hover:to-[#d6681a] transition-all duration-300 px-4 py-3 rounded-lg shadow-md"
                    >
                      <span className="flex items-center gap-2">
                        <Users size={16} className="flex-shrink-0" />
                        Work With a Partner Who Thinks Beyond Ads.
                      </span>
                      {expandedSections.includes('partner') ? (
                        <ChevronDown size={18} className="flex-shrink-0" />
                      ) : (
                        <ChevronRight size={18} className="flex-shrink-0" />
                      )}
                    </button>
                    {expandedSections.includes('partner') && (
                      <div className="ml-4 mt-1 space-y-1 transition-all duration-200 ease-in-out bg-orange-50/20 rounded-lg">
                        <a 
                          href="/services/basic-business-process-review" 
                          className="block text-sm text-[#274290] hover:text-[#f27921] hover:bg-orange-50/50 transition-all duration-300 px-4 py-2 rounded-lg flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Target size={16} className="text-[#f27921] flex-shrink-0" />
                          Basic Business Process Review
                        </a>
                        <a 
                          href="/services/customer-experience-suggestions" 
                          className="block text-sm text-[#274290] hover:text-[#f27921] hover:bg-orange-50/50 transition-all duration-300 px-4 py-2 rounded-lg flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <MessageSquare size={16} className="text-[#f27921] flex-shrink-0" />
                          Customer Experience Suggestions
                        </a>
                        <a 
                          href="/services/bi-weekly-strategy-calls" 
                          className="block text-sm text-[#274290] hover:text-[#f27921] hover:bg-orange-50/50 transition-all duration-300 px-4 py-2 rounded-lg flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Clock size={16} className="text-[#f27921] flex-shrink-0" />
                          Bi-Weekly Strategy Calls
                        </a>
                        <a 
                          href="/services/staff-onboarding-support" 
                          className="block text-sm text-[#274290] hover:text-[#f27921] hover:bg-orange-50/50 transition-all duration-300 px-4 py-2 rounded-lg flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Users size={16} className="text-[#f27921] flex-shrink-0" />
                          Staff Onboarding Support
                        </a>
                        <a 
                          href="/services/unlimited-marketing-consulting" 
                          className="block text-sm text-[#274290] hover:text-[#f27921] hover:bg-orange-50/50 transition-all duration-300 px-4 py-2 rounded-lg flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Brain size={16} className="text-[#f27921] flex-shrink-0" />
                          Unlimited Marketing Consulting
                        </a>
                        <a 
                          href="/services/full-business-process-audit" 
                          className="block text-sm text-[#274290] hover:text-[#f27921] hover:bg-orange-50/50 transition-all duration-300 px-4 py-2 rounded-lg flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <TrendingUp size={16} className="text-[#f27921] flex-shrink-0" />
                          Full Business Process Audit
                        </a>
                        <a 
                          href="/services/quarterly-business-health-deep-dive" 
                          className="block text-sm text-[#274290] hover:text-[#f27921] hover:bg-orange-50/50 transition-all duration-300 px-4 py-2 rounded-lg flex items-center gap-2"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Target size={16} className="text-[#f27921] flex-shrink-0" />
                          Quarterly Business Health Deep-Dive
                        </a>
                      </div>
                    )}
                  </div>

                </div>

                <div className="border-t border-white/20 mt-2 pt-2">
                  <a 
                    href="/about" 
                    className="text-[#274290] font-medium hover:text-white hover:bg-white/10 transition-all duration-300 px-4 py-2 rounded-lg block"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    About
                  </a>
                  <a 
                    href="/about-ahmed" 
                    className="text-[#274290] font-medium hover:text-white hover:bg-white/10 transition-all duration-300 px-4 py-2 rounded-lg block"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    About Ahmed
                  </a>
                  <a 
                    href="#contact" 
                    className="text-[#274290] font-medium hover:text-white hover:bg-white/10 transition-all duration-300 px-4 py-2 rounded-lg block"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Contact
                  </a>
                  <a 
                    href="#contact" 
                    className="bg-[#274290] text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-all duration-300 inline-block w-full text-center mt-2 shadow-lg"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Get Started
                  </a>
                </div>
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
