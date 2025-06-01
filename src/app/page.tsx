
import EvalPromptBuilder from '@/components/EvalPromptBuilder';


export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Evaluation Prompt Builder */}
      <section className='min-h-screen'>
        <EvalPromptBuilder />
      </section>

    </div>
  );
}
