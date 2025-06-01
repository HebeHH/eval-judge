import PromptTest from '@/components/PromptTest';
import BatchScoreTest from '@/components/BatchScoreTest';
import EvalPromptBuilder from '@/components/EvalPromptBuilder';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Evaluation Prompt Builder */}
      <section className='min-h-screen'>
        <EvalPromptBuilder />
      </section>

      {/* Testing Components Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-royal-heath-900 mb-4">
              Testing Components
            </h2>
            <p className="text-lg text-royal-heath-700">
              Test individual API endpoints and components
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* UserJudge Test Link */}
            <div className="bg-royal-heath-50 rounded-xl p-6 border-2 border-royal-heath-200">
              <h3 className="text-xl font-semibold text-royal-heath-800 mb-3">
                UserJudge Component
              </h3>
              <p className="text-royal-heath-600 mb-4">
                Test the user comparison interface for judging test pairs
              </p>
              <Link 
                href="/test-userjudge"
                className="inline-block px-4 py-2 bg-royal-heath-600 text-white rounded-lg hover:bg-royal-heath-700 transition-colors"
              >
                Test UserJudge
              </Link>
            </div>

            {/* Prompt Test */}
            <div className="bg-royal-heath-50 rounded-xl p-6 border-2 border-royal-heath-200">
              <h3 className="text-xl font-semibold text-royal-heath-800 mb-3">
                Single Prompt API
              </h3>
              <p className="text-royal-heath-600 mb-4">
                Test individual LLM prompt calls
              </p>
              <PromptTest />
            </div>

            {/* Batch Score Test */}
            <div className="bg-royal-heath-50 rounded-xl p-6 border-2 border-royal-heath-200">
              <h3 className="text-xl font-semibold text-royal-heath-800 mb-3">
                Batch Scoring API
              </h3>
              <p className="text-royal-heath-600 mb-4">
                Test batch evaluation with progress tracking
              </p>
              <BatchScoreTest />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
