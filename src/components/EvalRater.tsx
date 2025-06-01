'use client';

import React, { useMemo, useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ReferenceLine } from 'recharts';

interface BatchScoreResult {
  id: number;
  score: number;
}

interface UserTestJudgement {
  testAid: number;
  testBid: number;
  judgement: number;
}

interface NormalizedResults {
  testAid: number;
  testBid: number;
  userJudgement: number;
  aiJudgement: number;
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
  const [copiedStats, setCopiedStats] = useState(false);

  // Normalize the data according to the specification
  const normalizedResults: NormalizedResults[] = useMemo(() => {
    return userTestJudgements.map(judgement => {
      const testA = batchScoreResults.find(result => result.id === judgement.testAid);
      const testB = batchScoreResults.find(result => result.id === judgement.testBid);
      
      if (!testA || !testB) {
        console.warn(`Missing batch score for test ${judgement.testAid} or ${judgement.testBid}`);
        return null;
      }

      // AI judgement = (B.score - A.score) / 5
      const aiJudgement = (testB.score - testA.score) / 7;
      
      return {
        testAid: judgement.testAid,
        testBid: judgement.testBid,
        userJudgement: judgement.judgement,
        aiJudgement: aiJudgement
      };
    }).filter(Boolean) as NormalizedResults[];
  }, [batchScoreResults, userTestJudgements]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (normalizedResults.length === 0) return null;

    const differences = normalizedResults.map(r => Math.abs(r.userJudgement - r.aiJudgement));
    const meanAbsoluteDifference = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
    
    const userMean = normalizedResults.reduce((sum, r) => sum + r.userJudgement, 0) / normalizedResults.length;
    const aiMean = normalizedResults.reduce((sum, r) => sum + r.aiJudgement, 0) / normalizedResults.length;
    
    // Calculate correlation coefficient
    const userValues = normalizedResults.map(r => r.userJudgement);
    const aiValues = normalizedResults.map(r => r.aiJudgement);
    
    const userVariance = userValues.reduce((sum, val) => sum + Math.pow(val - userMean, 2), 0) / userValues.length;
    const aiVariance = aiValues.reduce((sum, val) => sum + Math.pow(val - aiMean, 2), 0) / aiValues.length;
    const covariance = normalizedResults.reduce((sum, r) => sum + (r.userJudgement - userMean) * (r.aiJudgement - aiMean), 0) / normalizedResults.length;
    
    const correlation = covariance / Math.sqrt(userVariance * aiVariance);
    
    // Calculate linear regression for line of best fit
    const n = normalizedResults.length;
    const sumX = userValues.reduce((sum, val) => sum + val, 0);
    const sumY = aiValues.reduce((sum, val) => sum + val, 0);
    const sumXY = normalizedResults.reduce((sum, r) => sum + r.userJudgement * r.aiJudgement, 0);
    const sumXX = userValues.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return {
      count: normalizedResults.length,
      meanAbsoluteDifference: meanAbsoluteDifference.toFixed(3),
      userMean: userMean.toFixed(3),
      aiMean: aiMean.toFixed(3),
      correlation: isNaN(correlation) ? 'N/A' : correlation.toFixed(3),
      slope: isNaN(slope) ? 0 : slope,
      intercept: isNaN(intercept) ? 0 : intercept
    };
  }, [normalizedResults]);

  // Generate line of best fit data points
  const bestFitLine = useMemo(() => {
    if (!summaryStats || summaryStats.slope === 0) return [];
    
    const xMin = -1;
    const xMax = 1;
    const yMin = summaryStats.slope * xMin + summaryStats.intercept;
    const yMax = summaryStats.slope * xMax + summaryStats.intercept;
    
    return [
      { userJudgement: xMin, aiJudgement: yMin },
      { userJudgement: xMax, aiJudgement: yMax }
    ];
  }, [summaryStats]);

  const handleCopyStats = async () => {
    if (!summaryStats) return;
    
    const statsText = `Evaluation Comparison Summary:
- Total comparisons: ${summaryStats.count}
- Mean absolute difference: ${summaryStats.meanAbsoluteDifference}
- User judgement mean: ${summaryStats.userMean}
- AI judgement mean: ${summaryStats.aiMean}
- Correlation coefficient: ${summaryStats.correlation}

Evaluation Prompt: ${selectedPrompt.title}
Criteria: ${selectedPrompt.criteria}
Approach: ${selectedPrompt.approach}`;

    try {
      await navigator.clipboard.writeText(statsText);
      setCopiedStats(true);
      setTimeout(() => setCopiedStats(false), 2000);
    } catch (err) {
      console.error('Failed to copy stats:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-bl from-royal-heath-200 to-royal-heath-300 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-royal-heath-900 mb-6 text-center">
            Evaluation Results Comparison
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

          {/* Scatterplot */}
          {normalizedResults.length > 0 ? (
            <div className="bg-royal-heath-50 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-semibold text-royal-heath-800 mb-4">
                User vs AI Judgement Comparison
              </h2>
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{
                      top: 20,
                      right: 20,
                      bottom: 60,
                      left: 60,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                    <XAxis 
                      type="number" 
                      dataKey="userJudgement" 
                      name="User Judgement"
                      domain={[-1, 1]}
                      label={{ value: 'User Judgement', position: 'insideBottom', offset: -10 }}
                      stroke="#6366f1"
                    />
                    <YAxis 
                      type="number" 
                      dataKey="aiJudgement" 
                      name="AI Judgement"
                      domain={[-1, 1]}
                      label={{ value: 'AI Judgement', angle: -90, position: 'insideLeft' }}
                      stroke="#6366f1"
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as NormalizedResults;
                          return (
                            <div className="bg-white p-3 border border-royal-heath-200 rounded shadow-lg">
                              <p className="text-royal-heath-800">
                                <strong>Test {data.testAid} vs Test {data.testBid}</strong>
                              </p>
                              <p className="text-royal-heath-600">
                                User: {data.userJudgement.toFixed(3)}
                              </p>
                              <p className="text-royal-heath-600">
                                AI: {data.aiJudgement.toFixed(3)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    
                    {/* Perfect agreement reference line (diagonal) */}
                    <ReferenceLine 
                      segment={[{ x: -1, y: -1 }, { x: 1, y: 1 }]} 
                      stroke="#94a3b8" 
                      strokeDasharray="5 5" 
                      strokeWidth={1}
                    />
                    
                    {/* Line of best fit */}
                    {bestFitLine.length > 0 && (
                      <ReferenceLine 
                        segment={[
                          { x: bestFitLine[0].userJudgement, y: bestFitLine[0].aiJudgement }, 
                          { x: bestFitLine[1].userJudgement, y: bestFitLine[1].aiJudgement }
                        ]} 
                        stroke="#ef4444" 
                        strokeWidth={2}
                      />
                    )}
                    
                    <Scatter 
                      data={normalizedResults} 
                      fill="#6366f1" 
                      fillOpacity={0.7}
                      stroke="#4f46e5"
                      strokeWidth={1}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-royal-heath-600 mt-2">
                Each point represents a comparison between two test outputs. The gray dashed line shows perfect agreement, and the red line shows the line of best fit through the data.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <p className="text-yellow-800">
                No comparable data found. Make sure batch score results include scores for the tests referenced in user judgements.
              </p>
            </div>
          )}

          {/* Summary Statistics */}
          {summaryStats && (
            <div className="bg-royal-heath-50 rounded-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-royal-heath-800">
                  Summary Statistics
                </h2>
                <button
                  onClick={handleCopyStats}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    copiedStats 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-royal-heath-100 text-royal-heath-800 border border-royal-heath-200 hover:bg-royal-heath-200'
                  }`}
                >
                  {copiedStats ? '✓ Copied!' : 'Copy Stats'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-royal-heath-200">
                  <h3 className="font-semibold text-royal-heath-700 mb-2">Total Comparisons</h3>
                  <p className="text-2xl font-bold text-royal-heath-900">{summaryStats.count}</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-royal-heath-200">
                  <h3 className="font-semibold text-royal-heath-700 mb-2">Mean Absolute Difference</h3>
                  <p className="text-2xl font-bold text-royal-heath-900">{summaryStats.meanAbsoluteDifference}</p>
                  <p className="text-sm text-royal-heath-600">Lower is better</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-royal-heath-200">
                  <h3 className="font-semibold text-royal-heath-700 mb-2">Correlation</h3>
                  <p className="text-2xl font-bold text-royal-heath-900">{summaryStats.correlation}</p>
                  <p className="text-sm text-royal-heath-600">Closer to 1 is better</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-royal-heath-200">
                  <h3 className="font-semibold text-royal-heath-700 mb-2">User Judgement Mean</h3>
                  <p className="text-2xl font-bold text-royal-heath-900">{summaryStats.userMean}</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-royal-heath-200">
                  <h3 className="font-semibold text-royal-heath-700 mb-2">AI Judgement Mean</h3>
                  <p className="text-2xl font-bold text-royal-heath-900">{summaryStats.aiMean}</p>
                </div>
              </div>
            </div>
          )}

          {/* Raw Data Display */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Normalized Results */}
            <div className="bg-royal-heath-50 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-royal-heath-800 mb-4">
                Normalized Comparison Data
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {normalizedResults.map((result, index) => (
                  <div key={index} className="bg-white p-3 rounded border">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-royal-heath-700 font-medium">
                        Test {result.testAid} vs Test {result.testBid}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-royal-heath-600">
                        User: {result.userJudgement.toFixed(3)}
                      </span>
                      <span className="text-royal-heath-600">
                        AI: {result.aiJudgement.toFixed(3)}
                      </span>
                      <span className="text-royal-heath-600">
                        Diff: {Math.abs(result.userJudgement - result.aiJudgement).toFixed(3)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Original Data */}
            <div className="bg-royal-heath-50 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-royal-heath-800 mb-4">
                Original Data Summary
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-royal-heath-700 mb-2">
                    AI Batch Scores ({batchScoreResults.length} tests)
                  </h3>
                  <div className="bg-white p-3 rounded border max-h-32 overflow-y-auto">
                    {batchScoreResults.map((result) => (
                      <div key={result.id} className="flex justify-between text-sm">
                        <span>Test {result.id}:</span>
                        <span>{result.score}/10</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-royal-heath-700 mb-2">
                    User Judgements ({userTestJudgements.length} comparisons)
                  </h3>
                  <div className="bg-white p-3 rounded border max-h-32 overflow-y-auto">
                    {userTestJudgements.map((judgement, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{judgement.testAid} vs {judgement.testBid}:</span>
                        <span>{judgement.judgement}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 