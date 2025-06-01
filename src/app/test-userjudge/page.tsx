'use client';

import React, { useState } from 'react';
import UserJudge, { UserTestJudgement } from '@/components/UserJudge';

// Sample test data
const sampleTests = [
  {
    id: 1,
    text: "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is commonly used for typing practice."
  },
  {
    id: 2,
    text: "To be or not to be, that is the question. Whether 'tis nobler in the mind to suffer the slings and arrows of outrageous fortune."
  },
  {
    id: 3,
    text: "In a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole filled with the ends of worms and an oozy smell."
  },
  {
    id: 4,
    text: "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness."
  }
];

export default function TestUserJudgePage() {
  const [isJudgeOpen, setIsJudgeOpen] = useState(false);
  const [judgements, setJudgements] = useState<UserTestJudgement[]>([]);
  const [criteria, setCriteria] = useState('witty');
  
  // Simulate API progress
  const [apiProgress, setApiProgress] = useState(0);
  const [isApiRunning, setIsApiRunning] = useState(false);

  const handleStartJudging = () => {
    setIsJudgeOpen(true);
  };

  const handleJudgeComplete = (results: UserTestJudgement[]) => {
    setJudgements(results);
    setIsJudgeOpen(false);
    console.log('Judgements completed:', results);
  };

  const simulateApiCall = () => {
    setIsApiRunning(true);
    setApiProgress(0);
    
    const interval = setInterval(() => {
      setApiProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsApiRunning(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-royal-heath-50 to-royal-heath-100 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-royal-heath-900 mb-4">
            UserJudge Component Test
          </h1>
          <p className="text-lg text-royal-heath-700">
            Test the embeddable user comparison interface
          </p>
        </div>

        {/* Configuration Panel */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-royal-heath-800 mb-4">
            Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-royal-heath-700 mb-2">
                Criteria to judge:
              </label>
              <select
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
                className="w-full p-3 border border-royal-heath-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal-heath-500"
              >
                <option value="witty">Witty</option>
                <option value="intelligent">Intelligent</option>
                <option value="kind">Kind</option>
                <option value="creative">Creative</option>
                <option value="clear">Clear</option>
              </select>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleStartJudging}
                disabled={isJudgeOpen}
                className="w-full px-4 py-2 bg-royal-heath-600 text-white rounded-lg hover:bg-royal-heath-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {isJudgeOpen ? 'Judging in Progress...' : 'Start Human Judging'}
              </button>
              
              <button
                onClick={simulateApiCall}
                disabled={isApiRunning}
                className="w-full px-4 py-2 bg-royal-heath-500 text-white rounded-lg hover:bg-royal-heath-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {isApiRunning ? 'API Running...' : 'Simulate AI Evaluation'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area - Side by Side Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Left Column - UserJudge Component */}
          <div>
            <h3 className="text-lg font-semibold text-royal-heath-800 mb-4">
              Human Evaluation
            </h3>
            
            {isJudgeOpen ? (
              <UserJudge
                tests={sampleTests}
                criteria={criteria}
                onComplete={handleJudgeComplete}
                isOpen={isJudgeOpen}
                className="h-fit"
              />
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="text-royal-heath-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-royal-heath-600">
                  Click "Start Human Judging" to begin comparing test pairs
                </p>
              </div>
            )}
          </div>

          {/* Right Column - API Progress and Results */}
          <div className="space-y-6">
            
            {/* API Progress Section */}
            <div>
              <h3 className="text-lg font-semibold text-royal-heath-800 mb-4">
                AI Evaluation Progress
              </h3>
              
              <div className="bg-white rounded-xl shadow-lg p-6">
                {isApiRunning ? (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-royal-heath-700">
                        Processing tests...
                      </span>
                      <span className="text-sm text-royal-heath-600">
                        {apiProgress}%
                      </span>
                    </div>
                    <div className="bg-royal-heath-200 rounded-full h-3">
                      <div 
                        className="bg-royal-heath-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${apiProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-royal-heath-500 mt-2">
                      Evaluating test {Math.floor(apiProgress / 25) + 1} of 4
                    </p>
                  </div>
                ) : (
                  <div className="text-center text-royal-heath-600">
                    <p>No AI evaluation running</p>
                    <p className="text-sm text-royal-heath-500 mt-1">
                      Click "Simulate AI Evaluation" to start
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sample Tests Display */}
            <div>
              <h3 className="text-lg font-semibold text-royal-heath-800 mb-4">
                Test Data ({sampleTests.length} items)
              </h3>
              
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {sampleTests.map((test) => (
                    <div key={test.id} className="bg-royal-heath-50 p-3 rounded-lg">
                      <div className="font-medium text-royal-heath-700 mb-1 text-sm">
                        Test {test.id}:
                      </div>
                      <div className="text-royal-heath-600 text-xs">
                        {test.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {judgements.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-semibold text-royal-heath-800 mb-4">
              Human Evaluation Results ({judgements.length} comparisons)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {judgements.map((judgement, index) => (
                <div key={index} className="bg-royal-heath-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-royal-heath-700 font-medium">
                      Test {judgement.testAid} vs Test {judgement.testBid}
                    </span>
                    <span className="font-semibold text-royal-heath-800">
                      {judgement.judgement}
                    </span>
                  </div>
                  <div className="text-sm text-royal-heath-600 mt-1">
                    {judgement.judgement === -1 && `Test ${judgement.testAid} is a lot more ${criteria}`}
                    {judgement.judgement === -0.5 && `Test ${judgement.testAid} is more ${criteria}`}
                    {judgement.judgement === 0 && 'Tests are reasonably equal'}
                    {judgement.judgement === 0.5 && `Test ${judgement.testBid} is more ${criteria}`}
                    {judgement.judgement === 1 && `Test ${judgement.testBid} is a lot more ${criteria}`}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-royal-heath-100 rounded-lg">
              <h3 className="font-semibold text-royal-heath-800 mb-2">
                Raw Data (for development):
              </h3>
              <pre className="text-xs text-royal-heath-700 overflow-x-auto">
                {JSON.stringify(judgements, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 