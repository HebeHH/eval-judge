"use client";

import React, { useMemo, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

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

// Elephant decoration component
const ElephantCorner = ({
  position,
}: {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) => {
  const getPositionClasses = () => {
    switch (position) {
      case "top-left":
        return "top-4 left-4";
      case "top-right":
        return "top-4 right-20"; // Account for dark mode toggle
      case "bottom-left":
        return "bottom-4 left-4";
      case "bottom-right":
        return "bottom-4 right-4";
    }
  };

  return (
    <div
      className={`fixed ${getPositionClasses()} opacity-10 text-charcoal-400 hidden xl:block pointer-events-none z-10 elephant-float`}
    >
      <svg width="24" height="24" viewBox="0 0 100 100" fill="currentColor">
        <path d="M20 60C15 55 15 45 20 40C25 35 35 35 40 40C45 35 55 35 60 40C65 45 65 55 60 60C60 65 55 70 50 70C45 70 40 65 40 60C35 65 25 65 20 60Z" />
        <circle cx="35" cy="45" r="3" fill="currentColor" />
        <circle cx="55" cy="45" r="3" fill="currentColor" />
      </svg>
    </div>
  );
};

// Analysis methodology sidebar
const AnalysisMethodologySidebar = ({
  summaryStats,
}: {
  
  summaryStats: any;
}) => {
  return (
    <div className="hidden xl:block w-80 bg-white dark:bg-charcoal-900 border-l border-charcoal-200 dark:border-charcoal-700 p-8 overflow-y-auto">
      <div className="sticky top-0">
        <h3 className="text-heading-3 text-charcoal-800 dark:text-charcoal-50 mb-6">
          Statistical Analysis
        </h3>

        <div className="space-y-4 mb-8">
          <p className="text-body-small text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
            DeepAtuin analyzes correlation between AI and human judgments to
            validate your evaluation prompt&apos;s effectiveness.
          </p>
          <p className="text-body-small text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
            📊 <strong>Correlation Analysis:</strong> Compares absolute AI
            scores (0-10) with relative human preferences (-1 to 1).
          </p>
          <p className="text-body-small text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
            📈 <strong>Statistical Metrics:</strong> Mean absolute difference
            and correlation coefficient reveal alignment strength.
          </p>
        </div>

        {/* Key Metrics Summary */}
        {summaryStats && (
          <div className="mb-8 p-4 bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 rounded-sm">
            <h4 className="text-body font-medium text-charcoal-800 dark:text-charcoal-50 mb-3">
              Key Metrics
            </h4>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-caption text-charcoal-600 dark:text-charcoal-400">
                  COMPARISONS
                </span>
                <span className="text-body-small font-medium text-charcoal-800 dark:text-charcoal-50">
                  {summaryStats.count}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-caption text-charcoal-600 dark:text-charcoal-400">
                  CORRELATION
                </span>
                <span className="text-body-small font-medium text-charcoal-800 dark:text-charcoal-50">
                  {summaryStats.correlation}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-caption text-charcoal-600 dark:text-charcoal-400">
                  DIFFERENCE
                </span>
                <span className="text-body-small font-medium text-charcoal-800 dark:text-charcoal-50">
                  {summaryStats.meanAbsoluteDifference}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Interpretation Guide */}
        <div className="mb-8 p-4 bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-700 rounded-sm">
          <h4 className="text-body font-medium text-charcoal-800 dark:text-charcoal-50 mb-2">
            Interpretation Guide
          </h4>
          <div className="space-y-2 text-body-small text-charcoal-600 dark:text-charcoal-300">
            <p>
              <strong>Correlation ≥ 0.7:</strong> Strong alignment
            </p>
            <p>
              <strong>Correlation 0.5-0.7:</strong> Moderate alignment
            </p>
            <p>
              <strong>Correlation &lt; 0.5:</strong> Needs refinement
            </p>
          </div>
        </div>

        <div className="p-6 bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 rounded-sm">
          <h4 className="text-caption text-charcoal-600 dark:text-charcoal-400 mb-3">
            DEEPATUIN SYSTEM
          </h4>
          <p className="text-body-small text-charcoal-600 dark:text-charcoal-300 leading-relaxed">
            This analysis reveals whether your evaluation prompt actually
            captures human judgment patterns at scale.
          </p>
        </div>
      </div>
    </div>
  );
};

export default function EvalRater({
  batchScoreResults,
  userTestJudgements,
  selectedPrompt,
}: EvalRaterProps) {
  const [copiedStats, setCopiedStats] = useState(false);

  // Normalize the data according to the specification
  const normalizedResults: NormalizedResults[] = useMemo(() => {
    return userTestJudgements
      .map((judgement) => {
        const testA = batchScoreResults.find(
          (result) => result.id === judgement.testAid
        );
        const testB = batchScoreResults.find(
          (result) => result.id === judgement.testBid
        );

        if (!testA || !testB) {
          console.warn(
            `Missing batch score for test ${judgement.testAid} or ${judgement.testBid}`
          );
          return null;
        }

        // AI judgement = (B.score - A.score) / 5
        const aiJudgement = (testB.score - testA.score) / 7;

        return {
          testAid: judgement.testAid,
          testBid: judgement.testBid,
          userJudgement: judgement.judgement,
          aiJudgement: aiJudgement,
        };
      })
      .filter(Boolean) as NormalizedResults[];
  }, [batchScoreResults, userTestJudgements]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (normalizedResults.length === 0) return null;

    const differences = normalizedResults.map((r) =>
      Math.abs(r.userJudgement - r.aiJudgement)
    );
    const meanAbsoluteDifference =
      differences.reduce((sum, diff) => sum + diff, 0) / differences.length;

    const userMean =
      normalizedResults.reduce((sum, r) => sum + r.userJudgement, 0) /
      normalizedResults.length;
    const aiMean =
      normalizedResults.reduce((sum, r) => sum + r.aiJudgement, 0) /
      normalizedResults.length;

    // Calculate correlation coefficient
    const userValues = normalizedResults.map((r) => r.userJudgement);
    const aiValues = normalizedResults.map((r) => r.aiJudgement);

    const userVariance =
      userValues.reduce((sum, val) => sum + Math.pow(val - userMean, 2), 0) /
      userValues.length;
    const aiVariance =
      aiValues.reduce((sum, val) => sum + Math.pow(val - aiMean, 2), 0) /
      aiValues.length;
    const covariance =
      normalizedResults.reduce(
        (sum, r) =>
          sum + (r.userJudgement - userMean) * (r.aiJudgement - aiMean),
        0
      ) / normalizedResults.length;

    const correlation = covariance / Math.sqrt(userVariance * aiVariance);

    // Calculate linear regression for line of best fit
    const n = normalizedResults.length;
    const sumX = userValues.reduce((sum, val) => sum + val, 0);
    const sumY = aiValues.reduce((sum, val) => sum + val, 0);
    const sumXY = normalizedResults.reduce(
      (sum, r) => sum + r.userJudgement * r.aiJudgement,
      0
    );
    const sumXX = userValues.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
      count: normalizedResults.length,
      meanAbsoluteDifference: meanAbsoluteDifference.toFixed(3),
      userMean: userMean.toFixed(3),
      aiMean: aiMean.toFixed(3),
      correlation: isNaN(correlation) ? "N/A" : correlation.toFixed(3),
      slope: isNaN(slope) ? 0 : slope,
      intercept: isNaN(intercept) ? 0 : intercept,
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
      { userJudgement: xMax, aiJudgement: yMax },
    ];
  }, [summaryStats]);

  const handleCopyStats = async () => {
    if (!summaryStats) return;

    const statsText = `DeepAtuin Evaluation Analysis:
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
      console.error("Failed to copy stats:", err);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal-50 dark:bg-charcoal-900 flex">
      {/* Elephant decorations */}
      <ElephantCorner position="top-left" />
      <ElephantCorner position="top-right" />
      <ElephantCorner position="bottom-left" />
      <ElephantCorner position="bottom-right" />


      {/* Main Content */}
      <div className="flex-1 flex flex-col xl:flex-row">
        <div className="flex-1 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="card-elevated p-6 sm:p-8 lg:p-12">
              <h1 className="text-display text-charcoal-800 dark:text-charcoal-50 mb-6 sm:mb-8 text-center fade-in">
                DeepAtuin Analysis
              </h1>

              {/* Selected Prompt Info */}
              <div className="text-emphasis mb-8 sm:mb-12 p-6 sm:p-8 bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 fade-in">
                <h2 className="text-heading-2 text-charcoal-800 dark:text-charcoal-50 mb-4 sm:mb-6">
                  Validation Results: {selectedPrompt.title}
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-caption text-charcoal-600 dark:text-charcoal-400 mb-2">
                      EVALUATION CRITERIA
                    </h3>
                    <p className="text-body text-charcoal-800 dark:text-charcoal-200">
                      {selectedPrompt.criteria}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-caption text-charcoal-600 dark:text-charcoal-400 mb-2">
                      METHODOLOGICAL APPROACH
                    </h3>
                    <p className="text-body text-charcoal-800 dark:text-charcoal-200">
                      {selectedPrompt.approach}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scatterplot */}
              {normalizedResults.length > 0 ? (
                <div className="bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 p-4 sm:p-6 lg:p-8 mb-8 sm:mb-12">
                  <h2 className="text-heading-2 text-charcoal-800 dark:text-charcoal-50 mb-4 sm:mb-6">
                    Correlation Analysis
                  </h2>
                  <div className="h-64 sm:h-80 lg:h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        margin={{
                          top: 20,
                          right: 20,
                          bottom: 60,
                          left: 60,
                        }}
                      >
                        <CartesianGrid strokeDasharray="2 2" stroke="#e5e5e0" />
                        <XAxis
                          type="number"
                          dataKey="userJudgement"
                          name="Human Assessment"
                          domain={[-1, 1]}
                          label={{
                            value: "Human Assessment",
                            position: "insideBottom",
                            offset: -10,
                            style: { fill: "#666666" },
                          }}
                          stroke="#666666"
                          tick={{ fill: "#666666" }}
                        />
                        <YAxis
                          type="number"
                          dataKey="aiJudgement"
                          name="AI Assessment"
                          domain={[-1, 1]}
                          label={{
                            value: "AI Assessment",
                            angle: -90,
                            position: "insideLeft",
                            style: { fill: "#666666" },
                          }}
                          stroke="#666666"
                          tick={{ fill: "#666666" }}
                        />
                        <Tooltip
                          cursor={{ strokeDasharray: "2 2" }}
                          content={({
                            active,
                            payload,
                          }: {
                            active?: boolean;
                            payload?: any[];
                          }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0]
                                .payload as NormalizedResults;
                              return (
                                <div className="card p-4">
                                  <p className="text-body font-medium text-charcoal-800 dark:text-charcoal-200 mb-2">
                                    Response {data.testAid} vs Response{" "}
                                    {data.testBid}
                                  </p>
                                  <div className="space-y-1">
                                    <p className="text-body-small text-charcoal-600 dark:text-charcoal-300">
                                      Human: {data.userJudgement.toFixed(3)}
                                    </p>
                                    <p className="text-body-small text-charcoal-600 dark:text-charcoal-300">
                                      AI: {data.aiJudgement.toFixed(3)}
                                    </p>
                                  </div>
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
                              {
                                x: bestFitLine[0].userJudgement,
                                y: bestFitLine[0].aiJudgement,
                              },
                              {
                                x: bestFitLine[1].userJudgement,
                                y: bestFitLine[1].aiJudgement,
                              },
                            ]}
                            stroke="#b8956a"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                          />
                        )}

                        <Scatter
                          data={normalizedResults}
                          fill="#1a1a1a"
                          fillOpacity={0.8}
                          stroke="#666666"
                          strokeWidth={1}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-body-small text-charcoal-600 dark:text-charcoal-300 mt-4">
                    Correlation visualization between human and AI assessments.
                    The dashed line represents the line of best fit through the
                    data points.
                  </p>
                </div>
              ) : (
                <div className="bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-700 p-6 sm:p-8 mb-8 sm:mb-12">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-0.5 bg-gold-500"></div>
                    <p className="text-charcoal-800 dark:text-charcoal-200">
                      Insufficient data for correlation analysis. Ensure batch
                      evaluation results correspond to human assessment test
                      pairs.
                    </p>
                  </div>
                </div>
              )}

              {/* Summary Statistics */}
              {summaryStats && (
                <div className="bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 p-6 sm:p-8 mb-8 sm:mb-12">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
                    <h2 className="text-heading-2 text-charcoal-800 dark:text-charcoal-50">
                      Statistical Summary
                    </h2>
                    <button
                      onClick={handleCopyStats}
                      className={`btn-secondary self-start sm:self-auto ${
                        copiedStats
                          ? "bg-gold-50 dark:bg-gold-900/20 text-charcoal-800 dark:text-charcoal-200 border-gold-300 dark:border-gold-700"
                          : ""
                      }`}
                    >
                      {copiedStats
                        ? "Copied to Clipboard"
                        : "Export Statistics"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="card p-4 sm:p-6">
                      <h3 className="text-caption text-charcoal-600 dark:text-charcoal-400 mb-3">
                        TOTAL COMPARISONS
                      </h3>
                      <p className="text-heading-1 text-charcoal-800 dark:text-charcoal-50">
                        {summaryStats.count}
                      </p>
                    </div>

                    <div className="card p-4 sm:p-6">
                      <h3 className="text-caption text-charcoal-600 dark:text-charcoal-400 mb-3">
                        MEAN ABSOLUTE DIFFERENCE
                      </h3>
                      <p className="text-heading-1 text-charcoal-800 dark:text-charcoal-50">
                        {summaryStats.meanAbsoluteDifference}
                      </p>
                      <p className="text-body-small text-charcoal-500 dark:text-charcoal-400 mt-2">
                        Lower values indicate better alignment
                      </p>
                    </div>

                    <div className="card p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
                      <h3 className="text-caption text-charcoal-600 dark:text-charcoal-400 mb-3">
                        CORRELATION COEFFICIENT
                      </h3>
                      <p className="text-heading-1 text-charcoal-800 dark:text-charcoal-50">
                        {summaryStats.correlation}
                      </p>
                      <p className="text-body-small text-charcoal-500 dark:text-charcoal-400 mt-2">
                        Values closer to 1.0 indicate stronger correlation
                      </p>
                    </div>

                    <div className="card p-4 sm:p-6">
                      <h3 className="text-caption text-charcoal-600 dark:text-charcoal-400 mb-3">
                        HUMAN ASSESSMENT MEAN
                      </h3>
                      <p className="text-heading-1 text-charcoal-800 dark:text-charcoal-50">
                        {summaryStats.userMean}
                      </p>
                    </div>

                    <div className="card p-4 sm:p-6">
                      <h3 className="text-caption text-charcoal-600 dark:text-charcoal-400 mb-3">
                        AI ASSESSMENT MEAN
                      </h3>
                      <p className="text-heading-1 text-charcoal-800 dark:text-charcoal-50">
                        {summaryStats.aiMean}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Data Display - Mobile Optimized */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
                {/* Normalized Results */}
                <div className="bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 p-4 sm:p-6 lg:p-8">
                  <h2 className="text-heading-3 text-charcoal-800 dark:text-charcoal-50 mb-4 sm:mb-6">
                    Normalized Assessment Data
                  </h2>
                  <div className="space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
                    {normalizedResults.map((result, index) => (
                      <div key={index} className="card p-3 sm:p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-body font-medium text-charcoal-700 dark:text-charcoal-300">
                            Response {result.testAid} vs {result.testBid}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-body-small">
                          <div>
                            <span className="text-charcoal-500 dark:text-charcoal-400">
                              Human:
                            </span>
                            <span className="text-charcoal-800 dark:text-charcoal-200 font-medium ml-2">
                              {result.userJudgement.toFixed(3)}
                            </span>
                          </div>
                          <div>
                            <span className="text-charcoal-500 dark:text-charcoal-400">
                              AI:
                            </span>
                            <span className="text-charcoal-800 dark:text-charcoal-200 font-medium ml-2">
                              {result.aiJudgement.toFixed(3)}
                            </span>
                          </div>
                          <div>
                            <span className="text-charcoal-500 dark:text-charcoal-400">
                              Δ:
                            </span>
                            <span className="text-charcoal-800 dark:text-charcoal-200 font-medium ml-2">
                              {Math.abs(
                                result.userJudgement - result.aiJudgement
                              ).toFixed(3)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Original Data */}
                <div className="bg-charcoal-50 dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 p-4 sm:p-6 lg:p-8">
                  <h2 className="text-heading-3 text-charcoal-800 dark:text-charcoal-50 mb-4 sm:mb-6">
                    Source Data Summary
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-caption text-charcoal-600 dark:text-charcoal-400 mb-3">
                        AI EVALUATION SCORES ({batchScoreResults.length}{" "}
                        responses)
                      </h3>
                      <div className="card p-3 sm:p-4 max-h-32 overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {batchScoreResults.map((result) => (
                            <div
                              key={result.id}
                              className="flex justify-between text-body-small"
                            >
                              <span className="text-charcoal-600 dark:text-charcoal-300">
                                Response {result.id}:
                              </span>
                              <span className="text-charcoal-800 dark:text-charcoal-200 font-medium">
                                {result.score}/10
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-caption text-charcoal-600 dark:text-charcoal-400 mb-3">
                        HUMAN ASSESSMENTS ({userTestJudgements.length}{" "}
                        comparisons)
                      </h3>
                      <div className="card p-3 sm:p-4 max-h-32 overflow-y-auto">
                        <div className="space-y-1">
                          {userTestJudgements.map((judgement, index) => (
                            <div
                              key={index}
                              className="flex justify-between text-body-small"
                            >
                              <span className="text-charcoal-600 dark:text-charcoal-300">
                                {judgement.testAid} vs {judgement.testBid}:
                              </span>
                              <span className="text-charcoal-800 dark:text-charcoal-200 font-medium">
                                {judgement.judgement.toFixed(2)}
                              </span>
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
        </div>

        {/* Methodology Sidebar */}
        <AnalysisMethodologySidebar summaryStats={summaryStats} />
      </div>
    </div>
  );
}
