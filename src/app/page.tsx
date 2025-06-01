import PromptTest from '@/components/PromptTest';
import BatchScoreTest from '@/components/BatchScoreTest';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            LLM API Testing Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Test the /prompt and /batchScore API endpoints with interactive components
          </p>
        </div>

        <div className="space-y-12">
          {/* Prompt Test Section */}
          <section>
            <PromptTest />
          </section>

          {/* Batch Score Test Section */}
          <section>
            <BatchScoreTest />
          </section>
        </div>

        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>Built with Next.js, OpenAI API, and Tailwind CSS</p>
        </footer>
      </div>
    </div>
  );
}
