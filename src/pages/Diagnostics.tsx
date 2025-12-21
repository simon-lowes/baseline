/**
 * Diagnostics Page
 * Development-only page to test backend services
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { kv, auth, getRuntimeStatus } from '@/runtime/appRuntime';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export function Diagnostics() {
  const [kvTestKey, setKvTestKey] = useState('test-key');
  const [kvTestValue, setKvTestValue] = useState('test-value');
  const [kvResult, setKvResult] = useState<string | null>(null);
  const [kvError, setKvError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const status = getRuntimeStatus();

  async function runKvRoundtrip() {
    setIsRunning(true);
    setKvResult(null);
    setKvError(null);

    try {
      // Set
      await kv.set(kvTestKey, kvTestValue);
      
      // Get
      const retrieved = await kv.get<string>(kvTestKey);
      
      // Verify
      if (retrieved === kvTestValue) {
        setKvResult(`✓ Roundtrip successful: "${retrieved}"`);
      } else {
        setKvError(`Value mismatch: expected "${kvTestValue}", got "${retrieved}"`);
      }
      
      // Cleanup
      await kv.delete(kvTestKey);
    } catch (err) {
      setKvError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  }

  async function listAllKvKeys() {
    setIsRunning(true);
    setKvResult(null);
    setKvError(null);

    try {
      const keys = await kv.list();
      setKvResult(`Found ${keys.length} keys: ${keys.join(', ') || '(none)'}`);
    } catch (err) {
      setKvError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Diagnostics</h1>
          <p className="text-muted-foreground">Development-only backend service testing</p>
        </div>

        {/* Environment Status */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Status</CardTitle>
            <CardDescription>Current backend provider configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">KV Storage</span>
                <Badge variant="secondary">{status.kv}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Authentication</span>
                <Badge variant="secondary">{status.auth}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database</span>
                <Badge variant="secondary">{status.db}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auth Status */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>Current user session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {auth.getUser() ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Signed in as: {auth.getUser()?.email ?? auth.getUser()?.id}</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Not signed in</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KV Roundtrip Test */}
        <Card>
          <CardHeader>
            <CardTitle>KV Storage Test</CardTitle>
            <CardDescription>Test set/get/delete roundtrip</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Key"
                  value={kvTestKey}
                  onChange={(e) => setKvTestKey(e.target.value)}
                />
                <Input
                  placeholder="Value"
                  value={kvTestValue}
                  onChange={(e) => setKvTestValue(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={runKvRoundtrip} disabled={isRunning}>
                  {isRunning && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Test Roundtrip
                </Button>
                <Button variant="outline" onClick={listAllKvKeys} disabled={isRunning}>
                  List All Keys
                </Button>
              </div>
            </div>

            {kvResult && (
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md text-green-700 dark:text-green-300 text-sm">
                {kvResult}
              </div>
            )}
            {kvError && (
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-md text-red-700 dark:text-red-300 text-sm">
                {kvError}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
