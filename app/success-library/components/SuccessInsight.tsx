import Image from 'next/image'

interface SuccessInsight {
  title: string
  category: string
  image: string
  context: string
  actions: string[]
  results: Array<{
    metric: string
    label: string
  }>
  nextSteps: string
  client: {
    name: string
    location: string
    website: string
  }
}

interface SuccessInsightProps {
  insight: SuccessInsight
}

export default function SuccessInsight({ insight }: SuccessInsightProps) {
  return (
    <article className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#274290] to-[#f27921] p-6 text-white">
        <h3 className="text-lg lg:text-xl font-bold mb-3">
          {insight.title}
        </h3>
        <div className="text-sm text-white/90 mb-3">
          {insight.category}
        </div>
        <div className="text-white/80 leading-relaxed">
          <strong>Client:</strong> {insight.client.name} ({insight.client.location})
        </div>
      </div>

      {/* Visual */}
      <div className="aspect-video bg-gray-100 relative">
        <Image
          src={insight.image}
          alt={insight.title}
          fill
          className="object-cover"
          sizes="(max-width: 1200px) 100vw, 1200px"
        />
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Context */}
        <div>
          <h4 className="text-lg font-bold text-[#274290] mb-3">Challenge</h4>
          <p className="text-gray-600 leading-relaxed">
            {insight.context}
          </p>
        </div>

        {/* Actions */}
        <div>
          <h4 className="text-lg font-bold text-[#274290] mb-3">Our Approach</h4>
          <ul className="space-y-2">
            {insight.actions.map((action, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-[#f27921] rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-gray-600 leading-relaxed">{action}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Results */}
        <div>
          <h4 className="text-lg font-bold text-[#274290] mb-3">Results</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insight.results.map((result, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#274290] mb-1 text-center">
                  {result.metric}
                </div>
                <div className="text-sm text-gray-600 text-center">
                  {result.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div>
          <h4 className="text-lg font-bold text-[#274290] mb-3">Next Steps</h4>
          <p className="text-gray-600 leading-relaxed">
            {insight.nextSteps}
          </p>
        </div>
      </div>
    </article>
  )
}
