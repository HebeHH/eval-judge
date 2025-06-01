'use client';

import React, { useMemo, useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

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
    <div className="min-h-screen py-8" style={{ background: 'linear-gradient(135deg, #fefefe 0%, #f8f8f6 100%)' }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="bg-white rounded-lg border border-gray-200 p-8" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h1 className="text-3xl font-bold text-center mb-6" style={{ fontFamily: 'var(--font-playfair)', color: '#2c1810' }}>
            EvalAtuin Results Comparison
          </h1>
          
          {/* Selected Prompt Info */}
          <div className="bg-amber-50 rounded-md p-6 mb-8 border border-amber-200">
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: '#8b4513' }}>
              Selected Evaluation Prompt: <em>{selectedPrompt.title}</em>
            </h2>
            <p className="mb-3 leading-relaxed" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>
              <strong>Criteria:</strong> {selectedPrompt.criteria}
            </p>
            <p className="leading-relaxed" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>
              <strong>Approach:</strong> {selectedPrompt.approach}
            </p>
          </div>

          {/* Scatterplot */}
          {normalizedResults.length > 0 ? (
            <div className="bg-amber-50 rounded-md p-6 mb-8 border border-amber-200">
              <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'var(--font-playfair)', color: '#8b4513' }}>
                User vs AI Judgement Comparison
              </h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{
                      top: 20,
                      right: 20,
                      bottom: 60,
                      left: 60,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#d2b48c" />
                    <XAxis 
                      type="number" 
                      dataKey="userJudgement" 
                      name="User Judgement"
                      domain={[-1, 1]}
                      label={{ value: 'User Judgement', position: 'insideBottom', offset: -10 }}
                      stroke="#8b4513"
                    />
                    <YAxis 
                      type="number" 
                      dataKey="aiJudgement" 
                      name="AI Judgement"
                      domain={[-1, 1]}
                      label={{ value: 'AI Judgement', angle: -90, position: 'insideLeft' }}
                      stroke="#8b4513"
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as NormalizedResults;
                          return (
                            <div className="bg-white p-4 border border-amber-300 rounded shadow-lg" style={{ fontFamily: 'var(--font-crimson)' }}>
                              <p className="font-semibold mb-2" style={{ color: '#2c1810' }}>
                                Test {data.testAid} vs Test {data.testBid}
                              </p>
                              <p style={{ color: '#5a4a3a' }}>
                                User: {data.userJudgement.toFixed(3)}
                              </p>
                              <p style={{ color: '#5a4a3a' }}>
                                AI: {data.aiJudgement.toFixed(3)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    
                    {/* Line of best fit */}
                    {bestFitLine.length > 0 && (
                      <ReferenceLine 
                        segment={[
                          { x: bestFitLine[0].userJudgement, y: bestFitLine[0].aiJudgement }, 
                          { x: bestFitLine[1].userJudgement, y: bestFitLine[1].aiJudgement }
                        ]} 
                        stroke="#d2691e" 
                        strokeWidth={3}
                      />
                    )}
                    
                    <Scatter 
                      data={normalizedResults} 
                      fill="#8b4513" 
                      fillOpacity={0.7}
                      stroke="#654321"
                      strokeWidth={1}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm mt-3 leading-relaxed" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>
                Each point represents a comparison between two test outputs. The orange line shows the line of best fit through the data, revealing the correlation between human and AI judgements.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-300 rounded-md p-6 mb-8">
              <p className="font-medium" style={{ fontFamily: 'var(--font-crimson)', color: '#8b4513' }}>
                No comparable data found. Ensure batch score results include scores for the tests referenced in user judgements.
              </p>
            </div>
          )}

          {/* Summary Statistics */}
          {summaryStats && (
            <div className="bg-amber-50 rounded-md p-6 mb-8 border border-amber-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-playfair)', color: '#8b4513' }}>
                  Summary Statistics
                </h2>
                <button
                  onClick={handleCopyStats}
                  className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                    copiedStats 
                      ? 'bg-green-100 border border-green-300' 
                      : 'bg-amber-100 border border-amber-300 hover:bg-amber-200'
                  }`}
                  style={{ 
                    fontFamily: 'var(--font-playfair)',
                    color: copiedStats ? '#2d5016' : '#8b4513'
                  }}
                >
                  {copiedStats ? 'Copied' : 'Copy Statistics'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-md border border-amber-300">
                  <h3 className="font-semibold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: '#8b4513' }}>Total Comparisons</h3>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#2c1810' }}>{summaryStats.count}</p>
                </div>
                
                <div className="bg-white p-4 rounded-md border border-amber-300">
                  <h3 className="font-semibold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: '#8b4513' }}>Mean Absolute Difference</h3>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#2c1810' }}>{summaryStats.meanAbsoluteDifference}</p>
                  <p className="text-sm" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>Lower indicates better alignment</p>
                </div>
                
                <div className="bg-white p-4 rounded-md border border-amber-300">
                  <h3 className="font-semibold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: '#8b4513' }}>Correlation</h3>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#2c1810' }}>{summaryStats.correlation}</p>
                  <p className="text-sm" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>Closer to 1 indicates stronger agreement</p>
                </div>
                
                <div className="bg-white p-4 rounded-md border border-amber-300">
                  <h3 className="font-semibold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: '#8b4513' }}>User Judgement Mean</h3>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#2c1810' }}>{summaryStats.userMean}</p>
                </div>
                
                <div className="bg-white p-4 rounded-md border border-amber-300">
                  <h3 className="font-semibold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: '#8b4513' }}>AI Judgement Mean</h3>
                  <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: '#2c1810' }}>{summaryStats.aiMean}</p>
                </div>
              </div>
            </div>
          )}

          {/* Raw Data Display */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Normalized Results */}
            <div className="bg-amber-50 rounded-md p-6 border border-amber-200">
              <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'var(--font-playfair)', color: '#8b4513' }}>
                Normalized Comparison Data
              </h2>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {normalizedResults.map((result, index) => (
                  <div key={index} className="bg-white p-4 rounded border border-amber-300">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold" style={{ fontFamily: 'var(--font-playfair)', color: '#8b4513' }}>
                        Test {result.testAid} vs Test {result.testBid}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm" style={{ fontFamily: 'var(--font-crimson)' }}>
                      <span style={{ color: '#5a4a3a' }}>
                        User: {result.userJudgement.toFixed(3)}
                      </span>
                      <span style={{ color: '#5a4a3a' }}>
                        AI: {result.aiJudgement.toFixed(3)}
                      </span>
                      <span style={{ color: '#5a4a3a' }}>
                        Diff: {Math.abs(result.userJudgement - result.aiJudgement).toFixed(3)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Original Data */}
            <div className="bg-amber-50 rounded-md p-6 border border-amber-200">
              <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'var(--font-playfair)', color: '#8b4513' }}>
                Original Data Summary
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: '#8b4513' }}>
                    Batch Score Results ({batchScoreResults.length} items)
                  </h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {batchScoreResults.slice(0, 10).map((result) => (
                      <div key={result.id} className="bg-white p-3 rounded border border-amber-300">
                        <span className="font-medium" style={{ fontFamily: 'var(--font-crimson)', color: '#8b4513' }}>Test {result.id}: </span>
                        <span style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>{result.score}/10</span>
                      </div>
                    ))}
                    {batchScoreResults.length > 10 && (
                      <div className="text-center py-2" style={{ fontFamily: 'var(--font-crimson)', color: '#8a7968' }}>
                        ... and {batchScoreResults.length - 10} more
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: '#8b4513' }}>
                    User Test Judgements ({userTestJudgements.length} items)
                  </h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {userTestJudgements.slice(0, 10).map((judgement, index) => (
                      <div key={index} className="bg-white p-3 rounded border border-amber-300">
                        <span className="font-medium" style={{ fontFamily: 'var(--font-crimson)', color: '#8b4513' }}>
                          Test {judgement.testAid} vs {judgement.testBid}: 
                        </span>
                        <span className="ml-2" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>
                          {judgement.judgement.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {userTestJudgements.length > 10 && (
                      <div className="text-center py-2" style={{ fontFamily: 'var(--font-crimson)', color: '#8a7968' }}>
                        ... and {userTestJudgements.length - 10} more
                      </div>
                    )}
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