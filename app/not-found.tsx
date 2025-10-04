import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
 
export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#274290] mb-4">Not Found</h2>
        <p className="text-gray-600 mb-8">Could not find requested resource</p>
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 bg-[#f27921] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#d6681a] transition-all duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Return Home
        </Link>
      </div>
    </div>
  )
}
