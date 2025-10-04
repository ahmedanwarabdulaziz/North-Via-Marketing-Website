import SuccessInsight from './SuccessInsight'

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

interface SuccessInsightsProps {
  insights: SuccessInsight[]
}

export default function SuccessInsights({ insights }: SuccessInsightsProps) {
  return (
    <section id="case-studies" className="py-16 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-black text-[#274290] mb-4">
            Detailed Case Studies
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Deep dives into how we solved real business challenges and delivered measurable results.
          </p>
        </div>
        
        <div className="space-y-12">
          {insights.map((insight, index) => (
            <SuccessInsight key={index} insight={insight} />
          ))}
        </div>
      </div>
    </section>
  )
}
