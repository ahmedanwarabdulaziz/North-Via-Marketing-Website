'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin, Send } from 'lucide-react'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    service: '',
    message: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Reset form
    setFormData({
      name: '',
      email: '',
      company: '',
      service: '',
      message: ''
    })
    setIsSubmitting(false)
    
    // Show success message (you can implement a toast notification here)
    alert('Thank you for your message! We\'ll get back to you soon.')
  }

  return (
    <section id="contact" className="py-20 bg-white">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-brand-blue font-serif mb-6">
            Get In Touch
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Ready to transform your business? Let's discuss your marketing goals and 
            create a strategy that drives results.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* Contact Form */}
          <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
            <h3 className="text-2xl font-bold text-brand-blue mb-6">Send us a message</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-colors duration-300"
                    placeholder="Your full name"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-colors duration-300"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-colors duration-300"
                    placeholder="Your company"
                  />
                </div>
                
                <div>
                  <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-2">
                    Service Interest
                  </label>
                  <select
                    id="service"
                    name="service"
                    value={formData.service}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-colors duration-300"
                  >
                    <option value="">Select a service</option>
                    <option value="seo">Search Engine Optimization</option>
                    <option value="social-media">Social Media Marketing</option>
                    <option value="digital-ads">Digital Advertising</option>
                    <option value="content">Content Marketing</option>
                    <option value="lead-generation">Lead Generation</option>
                    <option value="analytics">Analytics & Reporting</option>
                    <option value="consultation">General Consultation</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-colors duration-300 resize-none"
                  placeholder="Tell us about your project and goals..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-orange text-white py-4 px-8 rounded-lg font-semibold hover:bg-orange-600 transition-colors duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  'Sending...'
                ) : (
                  <>
                    Send Message
                    <Send className="ml-2" size={20} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-brand-blue mb-6">Contact Information</h3>
              <p className="text-gray-600 leading-relaxed mb-8">
                Ready to start your marketing journey? Get in touch with us today for a 
                free consultation and discover how we can help grow your business.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-brand-orange/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="text-brand-orange" size={24} />
                </div>
                <div>
                  <div className="font-semibold text-brand-blue">Email</div>
                  <div className="text-gray-600">hello@nvm-marketing.com</div>
                  <div className="text-gray-600">support@nvm-marketing.com</div>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-brand-orange/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="text-brand-orange" size={24} />
                </div>
                <div>
                  <div className="font-semibold text-brand-blue">Phone</div>
                  <div className="text-gray-600">+1 (555) 123-4567</div>
                  <div className="text-gray-600">Mon-Fri: 9AM-6PM EST</div>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-brand-orange/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="text-brand-orange" size={24} />
                </div>
                <div>
                  <div className="font-semibold text-brand-blue">Office</div>
                  <div className="text-gray-600">123 Marketing Street</div>
                  <div className="text-gray-600">New York, NY 10001</div>
                </div>
              </div>
            </div>

            {/* Quick Response Promise */}
            <div className="bg-brand-gray/30 rounded-xl p-6">
              <h4 className="font-semibold text-brand-blue mb-3">Quick Response Promise</h4>
              <p className="text-gray-600 text-sm">
                We typically respond to all inquiries within 24 hours during business days. 
                For urgent matters, please call us directly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
