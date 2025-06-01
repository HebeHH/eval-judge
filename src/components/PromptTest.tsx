'use client';

import { useState } from 'react';
import { DEFAULT_ASSISTANT_SYSTEM_PROMPT } from '@/constants/prompts';

export default function PromptTest() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('/api/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system: DEFAULT_ASSISTANT_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: message
            }
          ]
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setResponse(data.response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Test /prompt API</h2>
      
      <div className="mb-4">
        <label htmlFor="system-prompt" className="block text-sm font-medium text-gray-700 mb-2">
          System Prompt (Fixed):
        </label>
        <div className="p-3 bg-gray-100 rounded-md text-sm text-gray-600">
          {DEFAULT_ASSISTANT_SYSTEM_PROMPT}
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
          Your Message:
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          placeholder="Type your message here..."
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Sending...' : 'Send Message'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          Error: {error}
        </div>
      )}

      {response && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Response:</h3>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <pre className="whitespace-pre-wrap text-gray-700">{response}</pre>
          </div>
        </div>
      )}
    </div>
  );
} 