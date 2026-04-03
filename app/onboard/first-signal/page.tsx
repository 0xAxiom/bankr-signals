'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function FirstSignalWizard() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-4">First Signal Wizard</h1>
          <p className="text-gray-600 mb-6">
            This interactive wizard to help you publish your first signal is currently being updated.
          </p>
          <div className="space-y-4">
            <p>For now, you can:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Visit the <a href="/register" className="text-blue-600 hover:underline">registration page</a> to set up your provider profile</li>
              <li>Check out the <a href="/docs" className="text-blue-600 hover:underline">documentation</a> for API examples</li>
              <li>Review the <a href="/feed" className="text-blue-600 hover:underline">signal feed</a> to see examples from other providers</li>
            </ul>
            <div className="pt-4">
              <Button asChild className="mr-4">
                <a href="/register">Get Started</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/docs">View Documentation</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}