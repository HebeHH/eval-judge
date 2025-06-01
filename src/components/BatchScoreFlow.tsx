'use client';

import React, { useState, useEffect, useCallback } from 'react';
import UserJudge, { UserTestJudgement } from './UserJudge';
import EvalRater from './EvalRater';
import { testOutputs } from '@/constants/testOutputs';

interface Test {
  id: number;
  text: string;
}

interface BatchScoreResult {
  id: number;
  score: number;
}

interface SelectedPrompt {
  title: string;
  content: string;
  approach: string;
  criteria: string;
}

interface BatchScoreFlowProps {
  selectedPrompt: SelectedPrompt;
  onBack: () => void;
}

// Configuration parameter for sample size
const SAMPLE_SIZE = 10;

export default function BatchScoreFlow({ selectedPrompt, onBack }: BatchScoreFlowProps) {
  const [testSample, setTestSample] = useState<Test[]>([]);
  const [batchScoreResults, setBatchScoreResults] = useState<BatchScoreResult[]>([]);
  const [userTestJudgements, setUserTestJudgements] = useState<UserTestJudgement[]>([]);
  const [isBatchScoreComplete, setIsBatchScoreComplete] = useState(false);
  const [isUserJudgeOpen, setIsUserJudgeOpen] = useState(true);
  const [isUserJudgeComplete, setIsUserJudgeComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Progress tracking
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize test sample on component mount
  useEffect(() => {
    // Take a random sample of test outputs
    const shuffled = [...testOutputs].sort(() => Math.random() - 0.5);
    const sample = shuffled.slice(0, SAMPLE_SIZE);
    setTestSample(sample);
  }, []);

  const startBatchScoring = useCallback(async () => {
    if (testSample.length === 0) return;
    
    setIsProcessing(true);
    setProgress({ current: 0, total: testSample.length });

    try {
      const response = await fetch('/api/batchScore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          judgingMatrix: selectedPrompt.content,
          tests: testSample
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start batch scoring');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const results: BatchScoreResult[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (data.type) {
                  case 'progress':
                    setProgress({ current: data.current, total: data.total });
                    break;
                  case 'result':
                    results.push(data.result);
                    break;
                  case 'complete':
                    setBatchScoreResults(data.results);
                    setIsBatchScoreComplete(true);
                    setIsProcessing(false);
                    // Close UserJudge if it's still open
                    setIsUserJudgeOpen(false);
                    break;
                  case 'error':
                    console.error('Batch scoring error:', data.error);
                    setIsProcessing(false);
                    break;
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in batch scoring:', error);
      setIsProcessing(false);
    }
  }, [testSample, selectedPrompt.content]);

  // Start batch scoring when test sample is ready
  useEffect(() => {
    if (testSample.length > 0 && !isProcessing) {
      startBatchScoring();
    }
  }, [testSample, isProcessing, startBatchScoring]);

  const handleUserJudgeComplete = useCallback((judgements: UserTestJudgement[]) => {
    setUserTestJudgements(judgements);
    setIsUserJudgeComplete(true);
    setIsUserJudgeOpen(false);
  }, []);

  // Show results when both processes are complete
  useEffect(() => {
    if (isBatchScoreComplete && (isUserJudgeComplete || !isUserJudgeOpen)) {
      setShowResults(true);
    }
  }, [isBatchScoreComplete, isUserJudgeComplete, isUserJudgeOpen]);

  if (showResults) {
    return (
      <EvalRater
        batchScoreResults={batchScoreResults}
        userTestJudgements={userTestJudgements}
        selectedPrompt={selectedPrompt}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-bl from-royal-heath-200 to-royal-heath-300 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-royal-heath-900">
              Evaluating: {selectedPrompt.criteria}
            </h1>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-royal-heath-100 text-royal-heath-700 border border-royal-heath-300 rounded-lg hover:bg-royal-heath-200 transition-colors"
            >
              Back to Prompt Builder
            </button>
          </div>
          <p className="text-royal-heath-600">
            Testing with {testSample.length} sample outputs using: {selectedPrompt.title}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-royal-heath-800">
              AI Batch Scoring Progress
            </h2>
            <span className="text-royal-heath-600">
              {progress.current} / {progress.total} completed
            </span>
          </div>
          
          <div className="w-full bg-royal-heath-200 rounded-full h-4">
            <div
              className="bg-royal-heath-600 h-4 rounded-full transition-all duration-300 flex items-center justify-center"
              style={{ 
                width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' 
              }}
            >
              {progress.total > 0 && (
                <span className="text-white text-xs font-medium">
                  {Math.round((progress.current / progress.total) * 100)}%
                </span>
              )}
            </div>
          </div>
          
          <div className="mt-3 text-sm text-royal-heath-600">
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-royal-heath-600"></div>
                <span>Processing test outputs with AI evaluation...</span>
              </div>
            ) : isBatchScoreComplete ? (
              <span className="text-green-600 font-medium">✓ Batch scoring completed!</span>
            ) : (
              <span>Preparing to start batch scoring...</span>
            )}
          </div>
        </div>

        {/* UserJudge Component */}
        {testSample.length > 0 && (
          <UserJudge
            tests={testSample}
            criteria={selectedPrompt.criteria}
            onComplete={handleUserJudgeComplete}
            isOpen={isUserJudgeOpen}
            className="mb-6"
          />
        )}

        {/* Status Information */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-royal-heath-800 mb-4">Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-royal-heath-50 rounded-lg p-4">
              <h4 className="font-medium text-royal-heath-700 mb-2">AI Batch Scoring</h4>
              <p className="text-sm text-royal-heath-600">
                {isBatchScoreComplete ? 
                  `✓ Completed - ${batchScoreResults.length} results` : 
                  isProcessing ? 
                    `Processing... (${progress.current}/${progress.total})` : 
                    'Preparing to start...'
                }
              </p>
            </div>
            <div className="bg-royal-heath-50 rounded-lg p-4">
              <h4 className="font-medium text-royal-heath-700 mb-2">Human Judgements</h4>
              <p className="text-sm text-royal-heath-600">
                {isUserJudgeComplete ? 
                  `✓ Completed - ${userTestJudgements.length} comparisons` : 
                  isUserJudgeOpen ? 
                    'Waiting for user input...' : 
                    'Closed'
                }
              </p>
            </div>
          </div>
          
          {isBatchScoreComplete && (isUserJudgeComplete || !isUserJudgeOpen) && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">
                🎉 Evaluation complete! Preparing results...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 