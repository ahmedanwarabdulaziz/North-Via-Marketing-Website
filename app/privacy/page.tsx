import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - North Via Marketing',
  description: 'Privacy Policy for North Via Marketing. Learn how we collect, use, and protect your personal information.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl lg:text-5xl font-bold text-[#274290] mb-8 font-serif">
            Privacy Policy
          </h1>
          <p className="text-gray-600 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          
          <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Introduction</h2>
              <p>
                North Via Marketing ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Information We Collect</h2>
              <p>We may collect information about you in a variety of ways. The information we may collect includes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Personal Data:</strong> Name, email address, phone number, company name, and other contact information you provide when contacting us or requesting services.</li>
                <li><strong>Usage Data:</strong> Information about how you access and use our website, including IP address, browser type, pages visited, and time spent on pages.</li>
                <li><strong>Cookies:</strong> We may use cookies and similar tracking technologies to track activity on our website and store certain information.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide, operate, and maintain our services</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Send you marketing communications (with your consent)</li>
                <li>Improve our website and services</li>
                <li>Monitor and analyze usage patterns and trends</li>
                <li>Detect and prevent fraud or abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Information Sharing and Disclosure</h2>
              <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>With service providers who assist us in operating our website and conducting our business</li>
                <li>When required by law or to respond to legal process</li>
                <li>To protect our rights, privacy, safety, or property</li>
                <li>With your consent or at your direction</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Data Security</h2>
              <p>
                We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access and receive a copy of your personal data</li>
                <li>Rectify inaccurate or incomplete data</li>
                <li>Request deletion of your personal data</li>
                <li>Object to processing of your personal data</li>
                <li>Request restriction of processing</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Cookies</h2>
              <p>
                Our website may use cookies to enhance your experience. You can set your browser to refuse cookies or alert you when cookies are being sent. However, some parts of our website may not function properly if you disable cookies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="mt-4">
                <strong>North Via Marketing</strong><br />
                Email: <a href="mailto:info@northviamarketing.com" className="text-[#f27921] hover:underline">info@northviamarketing.com</a><br />
                Website: <a href="/contact" className="text-[#f27921] hover:underline">Contact Page</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

