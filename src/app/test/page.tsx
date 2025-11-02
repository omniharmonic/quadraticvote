'use client';

import { useState } from 'react';

export default function TestDashboardPage() {
  const [status, setStatus] = useState<string>('Ready to test');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testEventCreation = async () => {
    setStatus('Creating test event...');
    setError(null);
    
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test Event - Quadratic Voting Demo',
          description: 'This is a test event to verify the system is working',
          visibility: 'public',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          decisionFramework: {
            framework_type: 'binary_selection',
            config: {
              threshold_mode: 'top_n',
              top_n_count: 3,
              tiebreaker: 'timestamp',
            },
          },
          optionMode: 'admin_defined',
          creditsPerVoter: 100,
          showResultsDuringVoting: true,
          showResultsAfterClose: true,
          initialOptions: [
            {
              title: 'Option A - Build a Park',
              description: 'Create a new community park',
            },
            {
              title: 'Option B - Library Expansion',
              description: 'Expand the local library',
            },
            {
              title: 'Option C - Road Repairs',
              description: 'Fix potholes and repave roads',
            },
            {
              title: 'Option D - Community Center',
              description: 'Build a new community center',
            },
            {
              title: 'Option E - Public Transit',
              description: 'Improve public transportation',
            },
          ],
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setStatus('✅ Event created successfully!');
        setResult(data);
      } else {
        setStatus('❌ Failed to create event');
        setError(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      setStatus('❌ Error occurred');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const testListEvents = async () => {
    setStatus('Fetching events...');
    setError(null);
    
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      
      if (response.ok) {
        setStatus('✅ Events fetched successfully!');
        setResult(data);
      } else {
        setStatus('❌ Failed to fetch events');
        setError(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      setStatus('❌ Error occurred');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            QuadraticVote.xyz
          </h1>
          <p className="text-gray-600 mb-8">
            System Status & API Testing Dashboard
          </p>

          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="font-semibold text-blue-900 mb-2">System Status</h2>
            <p className="text-blue-700">{status}</p>
          </div>

          <div className="space-y-4 mb-8">
            <button
              onClick={testEventCreation}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              🚀 Test Event Creation API
            </button>

            <button
              onClick={testListEvents}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              📋 Test List Events API
            </button>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-2">Error Details</h3>
              <pre className="text-red-700 text-sm overflow-x-auto whitespace-pre-wrap">
                {error}
              </pre>
            </div>
          )}

          {result && (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Response Data</h3>
              <pre className="text-green-700 text-sm overflow-x-auto whitespace-pre-wrap max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">System Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Framework:</span>
                <span className="ml-2 font-mono text-gray-900">Next.js 14</span>
              </div>
              <div>
                <span className="text-gray-600">Database:</span>
                <span className="ml-2 font-mono text-gray-900">PostgreSQL (Drizzle ORM)</span>
              </div>
              <div>
                <span className="text-gray-600">Cache:</span>
                <span className="ml-2 font-mono text-gray-900">Redis</span>
              </div>
              <div>
                <span className="text-gray-600">API Version:</span>
                <span className="ml-2 font-mono text-gray-900">v1.0-beta</span>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">⚠️ Prerequisites</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Database must be running and migrations applied</li>
              <li>• Redis must be available (local or Upstash)</li>
              <li>• Environment variables must be configured</li>
              <li>• Run: <code className="bg-gray-200 px-1 rounded">pnpm db:push</code> to apply schema</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

