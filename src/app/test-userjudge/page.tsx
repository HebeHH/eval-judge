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

  const handleStartJudging = () => {
    setIsJudgeOpen(true);
  };

  const handleJudgeComplete = (results: UserTestJudgement[]) => {
    setJudgements(results);
    setIsJudgeOpen(false);
    console.log('Judgements completed:', results);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-royal-heath-50 to-royal-heath-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-royal-heath-900 mb-4">
            UserJudge Component Test
          </h1>
          <p className="text-lg text-royal-heath-700">
            Test the user comparison interface with sample data
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-xl font-semibold text-royal-heath-800 mb-4">
            Configuration
          </h2>
          
          <div className="mb-6">
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

          <div className="mb-6">
            <h3 className="text-lg font-medium text-royal-heath-800 mb-3">
              Sample Tests ({sampleTests.length} items)
            </h3>
            <div className="space-y-3">
              {sampleTests.map((test) => (
                <div key={test.id} className="bg-royal-heath-50 p-4 rounded-lg">
                  <div className="font-medium text-royal-heath-700 mb-1">
                    Test {test.id}:
                  </div>
                  <div className="text-royal-heath-600 text-sm">
                    {test.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartJudging}
            disabled={isJudgeOpen}
            className="w-full px-6 py-3 bg-royal-heath-600 text-white rounded-lg hover:bg-royal-heath-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            {isJudgeOpen ? 'Judging in Progress...' : 'Start Judging'}
          </button>
        </div>

        {judgements.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-semibold text-royal-heath-800 mb-4">
              Results ({judgements.length} comparisons)
            </h2>
            
            <div className="space-y-3">
              {judgements.map((judgement, index) => (
                <div key={index} className="bg-royal-heath-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-royal-heath-700">
                      Test {judgement.testAid} vs Test {judgement.testBid}
                    </span>
                    <span className="font-semibold text-royal-heath-800">
                      Score: {judgement.judgement}
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

            <div className="mt-6 p-4 bg-royal-heath-100 rounded-lg">
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

      {/* UserJudge Component */}
      <UserJudge
        tests={sampleTests}
        criteria={criteria}
        onComplete={handleJudgeComplete}
        isOpen={isJudgeOpen}
      />
    </div>
  );
} 