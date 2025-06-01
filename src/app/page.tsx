import PromptTest from '@/components/PromptTest';
import BatchScoreTest from '@/components/BatchScoreTest';
import EvalPromptBuilder from '@/components/EvalPromptBuilder';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Evaluation Prompt Builder */}
      <section>
        <EvalPromptBuilder />
      </section>

      {/* Additional Testing Components */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              API Testing Dashboard
            </h2>
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
    </div>
  );
}
