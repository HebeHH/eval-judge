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
const SAMPLE_SIZE = 15;

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
    <div className="min-h-screen py-8" style={{ background: 'linear-gradient(135deg, #fefefe 0%, #f8f8f6 100%)' }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-playfair)', color: '#2c1810' }}>
              Evaluating: {selectedPrompt.criteria}
            </h1>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-amber-100 border border-amber-300 rounded-md hover:bg-amber-200 transition-all duration-200 font-medium"
              style={{ fontFamily: 'var(--font-playfair)', color: '#8b4513' }}
            >
              Return to Prompt Builder
            </button>
          </div>
          <p className="leading-relaxed" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>
            Testing with {testSample.length} sample outputs using the <em>{selectedPrompt.title}</em> approach
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-playfair)', color: '#2c1810' }}>
              AI Batch Scoring Progress
            </h2>
            <span className="font-medium" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>
              {progress.current} / {progress.total} completed
            </span>
          </div>
          
          <div className="w-full bg-amber-200 rounded-full h-4 border border-amber-300">
            <div
              className="h-4 rounded-full transition-all duration-300 flex items-center justify-center"
              style={{ 
                backgroundColor: '#8b4513',
                width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' 
              }}
            >
              {progress.total > 0 && (
                <span className="text-white text-xs font-medium" style={{ fontFamily: 'var(--font-playfair)' }}>
                  {Math.round((progress.current / progress.total) * 100)}%
                </span>
              )}
            </div>
          </div>
          
          <div className="mt-4" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>
            {isProcessing ? (
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: '#8b4513' }}></div>
                <span>Processing test outputs with scholarly precision...</span>
              </div>
            ) : isBatchScoreComplete ? (
              <span className="font-medium" style={{ color: '#2d5016' }}>Batch scoring completed with literary rigor</span>
            ) : (
              <span>Preparing to commence evaluation...</span>
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
        <div className="bg-white rounded-lg border border-gray-200 p-6" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: 'var(--font-playfair)', color: '#2c1810' }}>
            Evaluation Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-amber-50 rounded-md p-4 border border-amber-100">
              <h4 className="font-semibold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: '#8b4513' }}>
                AI Batch Scoring
              </h4>
              <p style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a', lineHeight: '1.6' }}>
                {isBatchScoreComplete ? 
                  `Completed with scholarly precision — ${batchScoreResults.length} results analyzed` : 
                  isProcessing ? 
                    `Processing with literary attention... (${progress.current}/${progress.total})` : 
                    'Preparing to commence evaluation...'
                }
              </p>
            </div>
            <div className="bg-amber-50 rounded-md p-4 border border-amber-100">
              <h4 className="font-semibold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: '#8b4513' }}>
                Human Judgements
              </h4>
              <p style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a', lineHeight: '1.6' }}>
                {isUserJudgeComplete ? 
                  `Completed with discerning insight — ${userTestJudgements.length} comparisons made` : 
                  isUserJudgeOpen ? 
                    'Awaiting your considered judgement...' : 
                    'Assessment concluded'
                }
              </p>
            </div>
          </div>
          
          {isBatchScoreComplete && (isUserJudgeComplete || !isUserJudgeOpen) && (
            <div className="mt-4 p-4 rounded-md border" style={{ backgroundColor: '#f0f8e8', borderColor: '#c3d9b0' }}>
              <p className="font-medium" style={{ fontFamily: 'var(--font-playfair)', color: '#2d5016' }}>
                Evaluation complete. Preparing comprehensive analysis...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 