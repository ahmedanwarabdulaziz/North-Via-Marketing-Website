import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-brand-blue text-white">
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="bg-brand-gray px-4 py-2 rounded-lg flex items-center space-x-3 mb-4 inline-block">
              <Image
                src="/Logo-1.png"
                alt="North Via Marketing Logo"
                width={40}
                height={40}
                className="object-contain"
              />
              <div className="text-2xl font-bold font-serif text-brand-blue">
                North Via Marketing
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed mb-6 max-w-md">
              Strategic digital marketing solutions that drive results. We help businesses 
              increase their online presence, generate leads, and maximize ROI through 
              data-driven marketing strategies.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="text-brand-orange" size={20} />
                <span className="text-gray-300">hello@northviamarketing.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="text-brand-orange" size={20} />
                <span className="text-gray-300">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="text-brand-orange" size={20} />
                <span className="text-gray-300">123 Marketing Street, NY 10001</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-xl font-semibold mb-6">Our Services</h3>
            <ul className="space-y-3">
              <li>
                <a href="#services" className="text-gray-300 hover:text-brand-orange transition-colors duration-300">
                  Search Engine Optimization
                </a>
              </li>
              <li>
                <a href="#services" className="text-gray-300 hover:text-brand-orange transition-colors duration-300">
                  Social Media Marketing
                </a>
              </li>
              <li>
                <a href="#services" className="text-gray-300 hover:text-brand-orange transition-colors duration-300">
                  Digital Advertising
                </a>
              </li>
              <li>
                <a href="#services" className="text-gray-300 hover:text-brand-orange transition-colors duration-300">
                  Content Marketing
                </a>
              </li>
              <li>
                <a href="#services" className="text-gray-300 hover:text-brand-orange transition-colors duration-300">
                  Lead Generation
                </a>
              </li>
              <li>
                <a href="#services" className="text-gray-300 hover:text-brand-orange transition-colors duration-300">
                  Analytics & Reporting
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-semibold mb-6">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <a href="#home" className="text-gray-300 hover:text-brand-orange transition-colors duration-300">
                  Home
                </a>
              </li>
              <li>
                <a href="#about" className="text-gray-300 hover:text-brand-orange transition-colors duration-300">
                  About Us
                </a>
              </li>
              <li>
                <a href="#services" className="text-gray-300 hover:text-brand-orange transition-colors duration-300">
                  Services
                </a>
              </li>
              <li>
                <a href="#contact" className="text-gray-300 hover:text-brand-orange transition-colors duration-300">
                  Contact
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-gray-300 hover:text-brand-orange transition-colors duration-300">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="text-gray-300 hover:text-brand-orange transition-colors duration-300">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-300 text-sm mb-4 md:mb-0">
              © 2024 North Via Marketing. All rights reserved.
            </div>
            
            {/* Social Media Links */}
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="w-10 h-10 bg-brand-orange/20 rounded-lg flex items-center justify-center hover:bg-brand-orange transition-colors duration-300"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-brand-orange/20 rounded-lg flex items-center justify-center hover:bg-brand-orange transition-colors duration-300"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-brand-orange/20 rounded-lg flex items-center justify-center hover:bg-brand-orange transition-colors duration-300"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-brand-orange/20 rounded-lg flex items-center justify-center hover:bg-brand-orange transition-colors duration-300"
                aria-label="LinkedIn"
              >
                <Linkedin size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
