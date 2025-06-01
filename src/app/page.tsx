import EvalPromptBuilder from '@/components/EvalPromptBuilder';


export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #fefefe 0%, #f8f8f6 100%)' }}>
      {/* Main Evaluation Prompt Builder */}
      <section className='min-h-screen'>
        <EvalPromptBuilder />
      </section>

    </div>
  );
}
