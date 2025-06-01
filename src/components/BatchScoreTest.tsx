'use client';

import { useState } from 'react';
import { DEFAULT_JUDGING_MATRIX } from '@/constants/prompts';

interface TestResult {
  id: number;
  score: number;
}

interface ProgressData {
  current: number;
  total: number;
  currentTest: number;
}

export default function BatchScoreTest() {
  const [judgingMatrix, setJudgingMatrix] = useState(DEFAULT_JUDGING_MATRIX);

  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<ProgressData | null>(null);

  // Dummy test data
  const dummyTests = [
    {
      id: 1,
      text: "The capital of France is Paris. It's a beautiful city known for its art, culture, and the Eiffel Tower."
    },
    {
      id: 2,
      text: "To make a sandwich, you need bread, filling, and condiments. Put the filling between two slices of bread."
    },
    {
      id: 3,
      text: "Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed."
    }
  ];

  const handleSubmit = async () => {
    if (!judgingMatrix.trim()) {
      setError('Please enter a judging matrix');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);
    setProgress(null);

    try {
      const response = await fetch('/api/batchScore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          judgingMatrix,
          tests: dummyTests
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'progress') {
                setProgress({
                  current: data.current,
                  total: data.total,
                  currentTest: data.currentTest
                });
              } else if (data.type === 'result') {
                setResults(prev => [...prev, data.result]);
              } else if (data.type === 'complete') {
                setResults(data.results);
                setProgress(null);
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = progress ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Test /batchScore API</h2>
      
      <div className="mb-6">
        <label htmlFor="judging-matrix" className="block text-sm font-medium text-gray-700 mb-2">
          Judging Matrix:
        </label>
        <textarea
          id="judging-matrix"
          value={judgingMatrix}
          onChange={(e) => setJudgingMatrix(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={8}
          placeholder="Enter your judging criteria..."
        />
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">Test Data (3 items):</h3>
        <div className="space-y-3">
          {dummyTests.map((test) => (
            <div key={test.id} className="p-3 bg-gray-50 border border-gray-200 rounded-md">
              <div className="font-medium text-gray-700">Test {test.id}:</div>
              <div className="text-gray-600 mt-1">{test.text}</div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {loading ? 'Processing...' : 'Start Batch Scoring'}
      </button>

      {progress && (
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Processing test {progress.currentTest}...</span>
            <span>{progress.current} / {progress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          Error: {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Results:</h3>
          <div className="space-y-3">
            {results.map((result) => {
              const test = dummyTests.find(t => t.id === result.id);
              return (
                <div key={result.id} className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">Test {result.id}</div>
                      <div className="text-gray-600 mt-1 text-sm">{test?.text}</div>
                    </div>
                    <div className="ml-4">
                      <div className="text-2xl font-bold text-blue-600">{result.score}/10</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 p-4 bg-gray-100 rounded-md">
            <div className="text-sm text-gray-600">
              Average Score: <span className="font-semibold">
                {(results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1)}/10
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 