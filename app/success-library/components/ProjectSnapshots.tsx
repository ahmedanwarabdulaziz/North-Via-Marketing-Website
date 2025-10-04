import Image from 'next/image'

interface ProjectSnapshot {
  image: string
  category: string
  title: string
  description: string
}

interface ProjectSnapshotsProps {
  snapshots: ProjectSnapshot[]
}

export default function ProjectSnapshots({ snapshots }: ProjectSnapshotsProps) {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-black text-[#274290] mb-4">
            Project Snapshots
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Quick glimpses into the results we've delivered across different marketing channels.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {snapshots.map((snapshot, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="aspect-video bg-gray-100 relative">
                <Image
                  src={snapshot.image}
                  alt={snapshot.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
              <div className="p-6">
                <div className="inline-block bg-[#f27921] text-white text-sm font-semibold px-3 py-1 rounded-full mb-3">
                  {snapshot.category}
                </div>
                <h3 className="text-xl font-bold text-[#274290] mb-2">
                  {snapshot.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {snapshot.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
