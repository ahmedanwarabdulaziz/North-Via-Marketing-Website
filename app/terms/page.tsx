import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - North Via Marketing',
  description: 'Terms of Service for North Via Marketing. Read our terms and conditions for using our website and services.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl lg:text-5xl font-bold text-[#274290] mb-8 font-serif">
            Terms of Service
          </h1>
          <p className="text-gray-600 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          
          <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Agreement to Terms</h2>
              <p>
                By accessing and using the North Via Marketing website and services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Use License</h2>
              <p>
                Permission is granted to temporarily access the materials on North Via Marketing's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display (commercial or non-commercial)</li>
                <li>Attempt to decompile or reverse engineer any software contained on the website</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
                <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Service Terms</h2>
              <p>
                When you engage our services, you agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate and complete information</li>
                <li>Pay all fees as agreed upon in your service agreement</li>
                <li>Use our services only for lawful purposes</li>
                <li>Not use our services to transmit harmful, offensive, or illegal content</li>
                <li>Respect intellectual property rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Intellectual Property</h2>
              <p>
                All content on this website, including but not limited to text, graphics, logos, images, and software, is the property of North Via Marketing or its content suppliers and is protected by copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Disclaimer</h2>
              <p>
                The materials on North Via Marketing's website are provided on an 'as is' basis. North Via Marketing makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Limitations of Liability</h2>
              <p>
                In no event shall North Via Marketing or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on North Via Marketing's website, even if North Via Marketing or a North Via Marketing authorized representative has been notified orally or in writing of the possibility of such damage.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Revisions and Errata</h2>
              <p>
                The materials appearing on North Via Marketing's website could include technical, typographical, or photographic errors. North Via Marketing does not warrant that any of the materials on its website are accurate, complete, or current. North Via Marketing may make changes to the materials contained on its website at any time without notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Payment Terms</h2>
              <p>
                Payment terms will be specified in your service agreement. Unless otherwise agreed, payment is due as outlined in your contract. Late payments may result in service suspension or termination.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Termination</h2>
              <p>
                We reserve the right to terminate or suspend access to our services immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Governing Law</h2>
              <p>
                These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which North Via Marketing operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Changes to Terms</h2>
              <p>
                North Via Marketing may revise these terms of service at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[#274290] mt-8 mb-4">Contact Information</h2>
              <p>
                If you have any questions about these Terms of Service, please contact us at:
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

