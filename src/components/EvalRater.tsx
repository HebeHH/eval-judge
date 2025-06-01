'use client';

import React from 'react';

interface BatchScoreResult {
  id: number;
  score: number;
}

interface UserTestJudgement {
  testAid: number;
  testBid: number;
  judgement: number;
}

interface EvalRaterProps {
  batchScoreResults: BatchScoreResult[];
  userTestJudgements: UserTestJudgement[];
  selectedPrompt: {
    title: string;
    content: string;
    approach: string;
    criteria: string;
  };
}

export default function EvalRater({ batchScoreResults, userTestJudgements, selectedPrompt }: EvalRaterProps) {
  return (
    <div className="min-h-screen bg-gradient-to-bl from-royal-heath-200 to-royal-heath-300 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-royal-heath-900 mb-6 text-center">
            Evaluation Results
          </h1>
          
          {/* Selected Prompt Info */}
          <div className="bg-royal-heath-50 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-royal-heath-800 mb-3">
              Selected Evaluation Prompt: {selectedPrompt.title}
            </h2>
            <p className="text-royal-heath-600 mb-3">
              <strong>Criteria:</strong> {selectedPrompt.criteria}
            </p>
            <p className="text-royal-heath-600 mb-3">
              <strong>Approach:</strong> {selectedPrompt.approach}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Batch Score Results */}
            <div className="bg-royal-heath-50 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-royal-heath-800 mb-4">
                AI Batch Scoring Results
              </h2>
              <p className="text-royal-heath-600 mb-4">
                Results from evaluating {batchScoreResults.length} test outputs using the selected prompt:
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {batchScoreResults.map((result) => (
                  <div key={result.id} className="flex justify-between items-center bg-white p-3 rounded border">
                    <span className="text-royal-heath-700">Test ID: {result.id}</span>
                    <span className="font-semibold text-royal-heath-800">Score: {result.score}/10</span>
                  </div>
                ))}
              </div>
              {batchScoreResults.length > 0 && (
                <div className="mt-4 p-3 bg-royal-heath-100 rounded">
                  <p className="text-royal-heath-700">
                    <strong>Average Score:</strong> {' '}
                    {(batchScoreResults.reduce((sum, r) => sum + r.score, 0) / batchScoreResults.length).toFixed(2)}/10
                  </p>
                </div>
              )}
            </div>

            {/* User Test Judgements */}
            <div className="bg-royal-heath-50 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-royal-heath-800 mb-4">
                Human Judgement Results
              </h2>
              <p className="text-royal-heath-600 mb-4">
                Results from {userTestJudgements.length} human comparisons:
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {userTestJudgements.map((judgement, index) => (
                  <div key={index} className="bg-white p-3 rounded border">
                    <div className="flex justify-between items-center">
                      <span className="text-royal-heath-700">
                        Test {judgement.testAid} vs Test {judgement.testBid}
                      </span>
                      <span className="font-semibold text-royal-heath-800">
                        {judgement.judgement === 0 ? 'Equal' : 
                         judgement.judgement > 0 ? `B wins (+${judgement.judgement})` : 
                         `A wins (${judgement.judgement})`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Debug Info */}
          <div className="mt-8 bg-gray-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Debug Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Batch Score Results:</h4>
                <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-40">
                  {JSON.stringify(batchScoreResults, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">User Test Judgements:</h4>
                <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-40">
                  {JSON.stringify(userTestJudgements, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 