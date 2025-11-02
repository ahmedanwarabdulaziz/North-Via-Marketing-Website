import { Mail, Phone, MapPin, Facebook, Instagram, Linkedin, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-[#274290] via-[#1e3568] to-[#274290] text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}></div>
      </div>

      <div className="relative z-10">
        {/* Main Footer Content */}
        <div className="container mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 mb-12">
            {/* Company Info */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <Image
                  src="/Logo-1.png"
                  alt="North Via Marketing Logo"
                  width={50}
                  height={50}
                  className="object-contain"
                />
                <div className="text-2xl font-bold font-serif text-white">
                  North Via Marketing
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed mb-6 text-sm">
                Strategic digital marketing solutions that drive measurable results. Partner with us to grow faster, smarter, and stronger.
              </p>
              
              {/* Social Media Links */}
              <div className="flex space-x-3">
                <a 
                  href="https://www.facebook.com/north.via.marketing" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 hover:bg-brand-orange rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label="Facebook"
                >
                  <Facebook size={18} className="text-white" />
                </a>
                <a 
                  href="https://www.instagram.com/northviamarketing" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 hover:bg-brand-orange rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label="Instagram"
                >
                  <Instagram size={18} className="text-white" />
                </a>
                <a 
                  href="https://www.linkedin.com/company/107492079" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 hover:bg-brand-orange rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label="LinkedIn"
                >
                  <Linkedin size={18} className="text-white" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-white border-b border-white/20 pb-2">
                Quick Links
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="text-gray-300 hover:text-brand-orange transition-colors duration-300 flex items-center group text-sm">
                    <ArrowRight size={14} className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="group-hover:translate-x-1 transition-transform">Home</span>
                  </Link>
                </li>
                <li>
                  <Link href="/#about" className="text-gray-300 hover:text-brand-orange transition-colors duration-300 flex items-center group text-sm">
                    <ArrowRight size={14} className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="group-hover:translate-x-1 transition-transform">About Us</span>
                  </Link>
                </li>
                <li>
                  <Link href="/services" className="text-gray-300 hover:text-brand-orange transition-colors duration-300 flex items-center group text-sm">
                    <ArrowRight size={14} className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="group-hover:translate-x-1 transition-transform">Services</span>
                  </Link>
                </li>
                <li>
                  <Link href="/success-library" className="text-gray-300 hover:text-brand-orange transition-colors duration-300 flex items-center group text-sm">
                    <ArrowRight size={14} className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="group-hover:translate-x-1 transition-transform">Success Library</span>
                  </Link>
                </li>
                <li>
                  <Link href="/seo-approach" className="text-gray-300 hover:text-brand-orange transition-colors duration-300 flex items-center group text-sm">
                    <ArrowRight size={14} className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="group-hover:translate-x-1 transition-transform">Our SEO Approach</span>
                  </Link>
                </li>
                <li>
                  <Link href="/#contact" className="text-gray-300 hover:text-brand-orange transition-colors duration-300 flex items-center group text-sm">
                    <ArrowRight size={14} className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="group-hover:translate-x-1 transition-transform">Contact</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-white border-b border-white/20 pb-2">
                Contact Us
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Mail className="text-brand-orange flex-shrink-0 mt-1" size={18} />
                  <a href="mailto:info@northviamarketing.com" className="text-gray-300 hover:text-brand-orange transition-colors duration-300 text-sm">
                    info@northviamarketing.com
                  </a>
                </div>
                <div className="flex items-start space-x-3">
                  <Phone className="text-brand-orange flex-shrink-0 mt-1" size={18} />
                  <a href="tel:+16476753343" className="text-gray-300 hover:text-brand-orange transition-colors duration-300 text-sm">
                    +1 (647) 675-3343
                  </a>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="text-brand-orange flex-shrink-0 mt-1" size={18} />
                  <span className="text-gray-300 text-sm">
                    509 Dundas St W<br />
                    Oakville, ON L6M 5P4, Canada
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-brand-orange/20 to-brand-orange/10 rounded-xl p-8 mb-12 text-center border border-white/10">
            <h3 className="text-2xl font-bold mb-3 text-white">Ready to Grow Your Business?</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Let's discuss how we can help you achieve your marketing goals with a free consultation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/#contact"
                className="inline-flex items-center justify-center bg-brand-orange text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#d6681a] transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                Get Started
                <ArrowRight className="ml-2" size={20} />
              </Link>
              <Link 
                href="/services"
                className="inline-flex items-center justify-center bg-white/10 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all duration-300 border border-white/20"
              >
                View All Services
              </Link>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-white/20 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-gray-300 text-sm text-center md:text-left">
                © {new Date().getFullYear()} North Via Marketing. All rights reserved.
              </div>
              
              <div className="flex flex-wrap justify-center gap-6 text-sm">
                <Link href="/privacy" className="text-gray-300 hover:text-brand-orange transition-colors duration-300">
                  Privacy Policy
                </Link>
                <span className="text-gray-500">|</span>
                <Link href="/terms" className="text-gray-300 hover:text-brand-orange transition-colors duration-300">
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
