'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  DEFAULT_QUESTIONS, 
  CRITICIZER_SYSTEM_PROMPT, 
  QUESTIONER_SYSTEM_PROMPT,
  EVAL_GENERATOR_SYSTEM_PROMPT_1,
  EVAL_GENERATOR_SYSTEM_PROMPT_2,
  EVAL_GENERATOR_SYSTEM_PROMPT_3,
  formatConversationForAgent,
  createCriticPrompt,
  createQuestionerPrompt,
  createEvalGeneratorPrompt
} from '@/constants/prompts';
import BatchScoreFlow from './BatchScoreFlow';
import '../cssSpinny.css';

type EvaluationCriteria = 'WITTY' | 'INTELLIGENT' | 'KIND';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface EvalPrompt {
  title: string;
  content: string;
  approach: string;
}

interface SelectedPrompt {
  title: string;
  content: string;
  approach: string;
  criteria: string;
}

const MAX_LOOPS = 2;

export default function EvalPromptBuilder() {
  const [selectedCriteria, setSelectedCriteria] = useState<EvaluationCriteria | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCriticizing, setIsCriticizing] = useState(false);
  const [currentLoop, setCurrentLoop] = useState(0);
  const [phase, setPhase] = useState<'selection' | 'conversation' | 'generation' | 'evaluation'>('selection');
  const [evalPrompts, setEvalPrompts] = useState<EvalPrompt[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingEvalPrompts, setStreamingEvalPrompts] = useState<{[key: number]: string}>({});
  const [isGeneratingEvals, setIsGeneratingEvals] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<SelectedPrompt | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const handleCriteriaSelection = (criteria: EvaluationCriteria) => {
    setSelectedCriteria(criteria);
    setPhase('conversation');
    
    // Add the default question as the first assistant message
    const defaultQuestion = DEFAULT_QUESTIONS[criteria];
    setMessages([{
      role: 'assistant',
      content: defaultQuestion,
      timestamp: new Date()
    }]);
  };

  const handlePromptSelection = (promptInfo: { title: string; approach: string; index: number }, finalPrompt: EvalPrompt) => {
    const selected: SelectedPrompt = {
      title: promptInfo.title,
      approach: promptInfo.approach,
      content: finalPrompt.content,
      criteria: selectedCriteria || 'UNKNOWN'
    };
    
    setSelectedPrompt(selected);
    setPhase('evaluation');
  };

  const handleBackToBuilder = () => {
    setSelectedPrompt(null);
    setPhase('generation');
  };

  const callLLMAPI = async (systemPrompt: string, userMessage: string): Promise<string> => {
    const response = await fetch('/api/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get LLM response');
    }

    const data = await response.json();
    return data.response;
  };

  const streamLLMResponse = async (systemPrompt: string, userMessage: string): Promise<string> => {
    setIsStreaming(true);
    setStreamingContent('');
    
    try {
      // For now, we'll simulate streaming by calling the regular API and displaying it progressively
      const fullResponse = await callLLMAPI(systemPrompt, userMessage);
      
      // Simulate streaming by revealing the text progressively
      const words = fullResponse.split(' ');
      let currentText = '';
      
      for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? ' ' : '') + words[i];
        setStreamingContent(currentText);
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay between words
      }
      
      setIsStreaming(false);
      setStreamingContent('');
      return fullResponse;
    } catch (error) {
      setIsStreaming(false);
      setStreamingContent('');
      throw error;
    }
  };

  const streamEvalPrompt = async (systemPrompt: string, userMessage: string, promptIndex: number): Promise<string> => {
    try {
      // Call the API to get the full response
      const fullResponse = await callLLMAPI(systemPrompt, userMessage);
      
      // Simulate streaming by revealing the text progressively
      const words = fullResponse.split(' ');
      let currentText = '';
      
      for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? ' ' : '') + words[i];
        setStreamingEvalPrompts(prev => ({
          ...prev,
          [promptIndex]: currentText
        }));
        await new Promise(resolve => setTimeout(resolve, 30)); // Faster streaming for eval prompts
      }
      
      return fullResponse;
    } catch (error) {
      console.error(`Error streaming eval prompt ${promptIndex}:`, error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: currentInput.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsLoading(true);

    try {
      if (currentLoop < MAX_LOOPS) {
        // LLM Loop: Criticizer -> Questioner -> Stream to user
        
        // 1. Call criticizer agent
        setIsCriticizing(true);
        const conversationHistory = formatConversationForAgent([...messages, userMessage]);
        const criticPrompt = createCriticPrompt(conversationHistory);
        const criticism = await callLLMAPI(CRITICIZER_SYSTEM_PROMPT, criticPrompt);
        
        // Log criticizer response to console
        console.log('Criticizer Response:', criticism);
        
        setIsCriticizing(false);
        
        // 2. Call questioner agent and stream response
        const questionerPrompt = createQuestionerPrompt(conversationHistory, criticism);
        const questionerResponse = await streamLLMResponse(QUESTIONER_SYSTEM_PROMPT, questionerPrompt);
        
        // 3. Add the response to messages
        const assistantMessage: Message = {
          role: 'assistant',
          content: questionerResponse,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setCurrentLoop(prev => prev + 1);
      } else {
        // Final loop - generate evaluation prompts
        const finalMessages = [...messages, userMessage];
        await generateEvalPrompts(finalMessages);
        setPhase('generation');
      }
    } catch (error) {
      console.error('Error in conversation:', error);
      // Add error message
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateEvalPrompts = async (finalMessages: Message[]) => {
    setIsGeneratingEvals(true);
    setStreamingEvalPrompts({});
    
    try {
      const conversationHistory = formatConversationForAgent(finalMessages);
      const evalPrompt = createEvalGeneratorPrompt(conversationHistory);
      
      // Generate all three prompts in parallel with streaming
      const promptPromises = [
        streamEvalPrompt(EVAL_GENERATOR_SYSTEM_PROMPT_1, evalPrompt, 0),
        streamEvalPrompt(EVAL_GENERATOR_SYSTEM_PROMPT_2, evalPrompt, 1),
        streamEvalPrompt(EVAL_GENERATOR_SYSTEM_PROMPT_3, evalPrompt, 2)
      ];
      
      const results = await Promise.all(promptPromises);
      
      const newEvalPrompts: EvalPrompt[] = [
        {
          title: 'Academic Structure',
          approach: 'highly structured, research-grade eval',
          content: results[0]
        },
        {
          title: 'Minimalist Practitioner',
          approach: 'streamlined, action-oriented evaluation',
          content: results[1]
        },
        {
          title: 'Balanced Generalist',
          approach: 'well-rounded, flexible evaluation',
          content: results[2]
        }
      ];
      
      setEvalPrompts(newEvalPrompts);
    } catch (error) {
      console.error('Error generating evaluation prompts:', error);
    } finally {
      setIsGeneratingEvals(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetBuilder = () => {
    setSelectedCriteria(null);
    setMessages([]);
    setCurrentInput('');
    setCurrentLoop(0);
    setPhase('selection');
    setEvalPrompts([]);
    setSelectedPrompt(null);
  };

  // Selection phase
  if (phase === 'selection') {
    return (
      <div className="min-h-screen py-12" style={{ background: 'linear-gradient(135deg, #fefefe 0%, #f8f8f6 100%)' }}>
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)', color: '#2c1810', letterSpacing: '-0.02em' }}>
              EvalAtuin
            </h1>
            <p className="text-lg leading-relaxed" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a', maxWidth: '600px', margin: '0 auto' }}>
              Create comprehensive evaluation prompts with the precision of a literary critic and the insight of a seasoned editor
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <h2 className="text-2xl font-semibold mb-8 text-center" style={{ fontFamily: 'var(--font-playfair)', color: '#2c1810' }}>
              Select Your Evaluation Criteria
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['WITTY', 'INTELLIGENT', 'KIND'] as const).map((criteria) => (
                <button
                  key={criteria}
                  onClick={() => handleCriteriaSelection(criteria)}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-amber-600 hover:bg-amber-50 transition-all duration-300 group transform hover:scale-105"
                  style={{ fontFamily: 'var(--font-crimson)' }}
                >
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: '#2c1810' }}>
                      {criteria}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {criteria === 'WITTY' && 'Evaluate humor, cleverness, and wit with the discernment of a literary connoisseur'}
                      {criteria === 'INTELLIGENT' && 'Assess reasoning, knowledge, and insight with scholarly rigor'}
                      {criteria === 'KIND' && 'Measure empathy, supportiveness, and care with humanistic sensitivity'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'generation') {
    return (
      <div className="min-h-screen py-8" style={{ background: 'linear-gradient(135deg, #fefefe 0%, #f8f8f6 100%)' }}>
        <div className="max-w-full mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)', color: '#2c1810' }}>
              Your Evaluation Prompts for {selectedCriteria}
            </h1>
            <p className="text-lg leading-relaxed mb-6" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>
              Three distinct approaches to evaluating {selectedCriteria?.toLowerCase()} responses, each crafted with scholarly precision
            </p>
            <button
              onClick={resetBuilder}
              className="px-6 py-3 rounded-md transition-all duration-200 font-medium"
              style={{ 
                backgroundColor: '#8b4513', 
                color: 'white',
                fontFamily: 'var(--font-playfair)',
                boxShadow: '0 2px 8px rgba(139, 69, 19, 0.3)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a0522d'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b4513'}
            >
              Begin Anew
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-16">
              <div className="loader mx-auto mb-6"></div>
              <p className="text-lg" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>
                Crafting your evaluation prompts with literary precision...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {[
                {
                  title: 'Academic Structure',
                  approach:"Highly structured, research-grade evaluation with scholarly rigor",
                  index: 0
                },
                {
                  title: 'Minimalist Practitioner',
                  approach: 'Streamlined, action-oriented evaluation with practical focus',
                  index: 1
                },
                {
                  title: 'Balanced Generalist',
                  approach: 'Well-rounded, flexible evaluation with comprehensive scope',
                  index: 2
                }
              ].map((promptInfo) => {
                const finalPrompt = evalPrompts[promptInfo.index];
                const streamingText = streamingEvalPrompts[promptInfo.index];
                const hasContent = finalPrompt?.content || streamingText;
                
                return (
                  <div key={promptInfo.index} className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col h-[calc(100vh-12rem)]" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                    <div className="mb-6 flex-shrink-0">
                      <h3 className="text-xl font-semibold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: '#2c1810' }}>
                        {promptInfo.title}
                      </h3>
                      <p className="leading-relaxed" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>
                        {promptInfo.approach}
                      </p>
                    </div>
                    
                    <div className="bg-amber-50 rounded-md p-6 flex-1 overflow-y-auto mb-6 border border-amber-100">
                      {hasContent ? (
                        <div>
                          <pre className="whitespace-pre-wrap text-sm leading-relaxed" style={{ fontFamily: 'var(--font-crimson)', color: '#2c1810' }}>
                            {finalPrompt?.content || streamingText}
                          </pre>
                          {streamingText && !finalPrompt && (
                            <div className="inline-block w-2 h-4 animate-pulse ml-1" style={{ backgroundColor: '#8b4513' }}></div>
                          )}
                        </div>
                      ) : isGeneratingEvals ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="flex space-x-2">
                            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: '#8b4513' }}></div>
                            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: '#8b4513', animationDelay: '0.1s' }}></div>
                            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: '#8b4513', animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center h-full flex items-center justify-center" style={{ fontFamily: 'var(--font-crimson)', color: '#8a7968' }}>
                          Awaiting inspiration...
                        </div>
                      )}
                    </div>
                    
                    {finalPrompt?.content && (
                      <div className="flex gap-3 flex-shrink-0">
                        <button
                          onClick={() => {
                            handlePromptSelection(promptInfo, finalPrompt);
                          }}
                          className="flex-1 px-4 py-3 rounded-md transition-all duration-200 font-medium"
                          style={{ 
                            backgroundColor: '#8b4513', 
                            color: 'white',
                            fontFamily: 'var(--font-playfair)',
                            boxShadow: '0 2px 8px rgba(139, 69, 19, 0.3)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a0522d'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b4513'}
                        >
                          Select This Prompt
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(finalPrompt.content)}
                          className="px-4 py-3 bg-amber-100 border border-amber-300 rounded-md hover:bg-amber-200 transition-all duration-200 font-medium"
                          style={{ fontFamily: 'var(--font-playfair)', color: '#8b4513' }}
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'evaluation') {
    return (
      <BatchScoreFlow
        selectedPrompt={selectedPrompt!}
        onBack={handleBackToBuilder}
      />
    );
  }

  // Conversation phase
  return (
    <div className="min-h-screen py-8" style={{ background: 'linear-gradient(135deg, #fefefe 0%, #f8f8f6 100%)' }}>
      <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 h-[92vh] flex flex-col">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-1 flex flex-col" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          {/* Header */}
          <div className="text-white p-6 flex-shrink-0" style={{ backgroundColor: '#8b4513' }}>
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-playfair)' }}>
                  Building Evaluation for: {selectedCriteria}
                </h1>
                <p className="mt-2 opacity-90" style={{ fontFamily: 'var(--font-crimson)' }}>
                  Conversation {currentLoop + 1} of {MAX_LOOPS + 1}
                </p>
              </div>
              <button
                onClick={resetBuilder}
                className="px-4 py-2 rounded-md transition-all duration-200 font-medium"
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  fontFamily: 'var(--font-playfair)',
                  border: '1px solid rgba(255,255,255,0.3)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              >
                Begin Anew
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-amber-200 h-1 flex-shrink-0">
            <div 
              className="h-1 transition-all duration-300"
              style={{ 
                backgroundColor: '#8b4513',
                width: `${((currentLoop + 1) / (MAX_LOOPS + 1)) * 100}%` 
              }}
            />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl p-4 rounded-lg ${
                    message.role === 'user'
                      ? 'text-white'
                      : 'bg-amber-50 border border-amber-100'
                  }`}
                  style={{
                    backgroundColor: message.role === 'user' ? '#8b4513' : undefined,
                    fontFamily: 'var(--font-crimson)',
                    color: message.role === 'user' ? 'white' : '#2c1810'
                  }}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' ? 'opacity-70' : 'opacity-60'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Streaming content */}
            {isStreaming && streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-3xl p-4 rounded-lg bg-amber-50 border border-amber-100" style={{ fontFamily: 'var(--font-crimson)', color: '#2c1810' }}>
                  <div className="whitespace-pre-wrap leading-relaxed">{streamingContent}</div>
                  <div className="inline-block w-2 h-3 animate-pulse ml-1" style={{ backgroundColor: '#8b4513' }}></div>
                </div>
              </div>
            )}
            
            {/* Criticizer loading animation */}
            {isCriticizing && (
              <div className="flex justify-start">
                <div className="max-w-3xl p-4 rounded-lg bg-amber-50 border border-amber-100" style={{ fontFamily: 'var(--font-crimson)', color: '#2c1810' }}>
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#8b4513' }}></div>
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#8b4513', animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#8b4513', animationDelay: '0.2s' }}></div>
                    </div>
                    <span>Analyzing conversation with scholarly attention...</span>
                  </div>
                </div>
              </div>
            )}
            
            {isLoading && !isStreaming && !isCriticizing && (
              <div className="flex justify-start">
                <div className="max-w-3xl p-4 rounded-lg bg-amber-50 border border-amber-100" style={{ fontFamily: 'var(--font-crimson)', color: '#2c1810' }}>
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: '#8b4513' }}></div>
                    <span>Contemplating with literary precision...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-6 flex-shrink-0">
            <div className="flex space-x-4">
              <textarea
                ref={textareaRef}
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share your thoughts about the evaluation criteria with the depth of a literary critic..."
                className="flex-1 p-4 border border-gray-300 rounded-md focus:outline-none focus:border-amber-600 resize-none bg-white transition-all duration-200"
                style={{ 
                  fontFamily: 'var(--font-crimson)',
                  color: '#2c1810',
                  fontSize: '16px',
                  lineHeight: '1.6'
                }}
                rows={3}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!currentInput.trim() || isLoading}
                className="px-6 py-3 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                style={{ 
                  backgroundColor: '#8b4513',
                  fontFamily: 'var(--font-playfair)',
                  boxShadow: '0 2px 8px rgba(139, 69, 19, 0.3)'
                }}
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#a0522d')}
                onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#8b4513')}
              >
                Send
              </button>
            </div>
            <p className="text-xs mt-3 opacity-60" style={{ fontFamily: 'var(--font-crimson)', color: '#5a4a3a' }}>
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 