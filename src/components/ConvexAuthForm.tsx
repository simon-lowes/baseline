/**
 * Convex Authentication Form Component
 * Uses Convex Auth hooks for email/password authentication
 */

import { useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react';

type AuthStage = 'signIn' | 'signUp';

interface ConvexAuthFormProps {
  onSuccess?: () => void;
  initialStage?: AuthStage;
}

function getFriendlyError(error: Error): string {
  const msg = error.message.toLowerCase();

  if (msg.includes('invalid') && msg.includes('credentials')) {
    return 'Incorrect email or password';
  }
  if (msg.includes('already') || msg.includes('exists')) {
    return 'An account with this email already exists';
  }
  if (msg.includes('email') && msg.includes('invalid')) {
    return 'Please enter a valid email address';
  }
  if (msg.includes('password') && (msg.includes('weak') || msg.includes('short'))) {
    return 'Password must be at least 6 characters';
  }
  if (msg.includes('rate') || msg.includes('limit')) {
    return 'Too many attempts. Please wait a moment and try again';
  }

  return error.message || 'Something went wrong. Please try again';
}

export function ConvexAuthForm({ onSuccess, initialStage = 'signIn' }: Readonly<ConvexAuthFormProps>) {
  const { signIn } = useAuthActions();
  const [stage, setStage] = useState<AuthStage>(initialStage);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  function goToStage(newStage: AuthStage) {
    setStage(newStage);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Convex Auth Password provider
      await signIn('password', { email, password, flow: 'signIn' });

      if (rememberMe) {
        localStorage.setItem('baseline-remember-session', 'true');
      } else {
        localStorage.removeItem('baseline-remember-session');
        sessionStorage.setItem('baseline-active-session', 'true');
      }

      toast.success('Welcome back!');
      onSuccess?.();
    } catch (error) {
      toast.error(getFriendlyError(error as Error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      // Convex Auth Password provider with signUp flow
      await signIn('password', { email, password, flow: 'signUp' });

      toast.success('Account created!');
      onSuccess?.();
    } catch (error) {
      toast.error(getFriendlyError(error as Error));
    } finally {
      setIsLoading(false);
    }
  }

  const emailInput = (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={isLoading}
        autoComplete="email"
        className="h-11"
      />
    </div>
  );

  const passwordInput = (
    <div className="space-y-2">
      <Label htmlFor="password">Password</Label>
      <div className="relative">
        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          autoComplete={stage === 'signUp' ? 'new-password' : 'current-password'}
          className="h-11 pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );

  const confirmPasswordInput = (
    <div className="space-y-2">
      <Label htmlFor="confirmPassword">Confirm password</Label>
      <Input
        id="confirmPassword"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        disabled={isLoading}
        autoComplete="new-password"
        className="h-11"
      />
    </div>
  );

  const trustBadge = (
    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-4">
      <ShieldCheck className="w-3.5 h-3.5" weight="fill" />
      <span>Your data stays private and secure</span>
    </div>
  );

  const loadingSpinner = (
    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );

  function renderSignIn() {
    return (
      <form onSubmit={handleSignIn} className="space-y-4">
        {emailInput}
        {passwordInput}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
            />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors select-none">
              Keep me signed in
            </span>
          </label>
        </div>

        <Button
          type="submit"
          className="w-full h-11 text-base"
          disabled={isLoading || !email.trim() || !password}
        >
          {isLoading ? <>{loadingSpinner} Signing in...</> : 'Sign in'}
        </Button>

        <p className="text-center text-sm text-muted-foreground pt-2">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => goToStage('signUp')}
            className="text-primary hover:underline font-medium"
          >
            Create one
          </button>
        </p>

        {trustBadge}
      </form>
    );
  }

  function renderSignUp() {
    return (
      <form onSubmit={handleSignUp} className="space-y-4">
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-foreground">Create your account</h2>
          <p className="text-sm text-muted-foreground">Get started tracking in minutes</p>
        </div>

        {emailInput}
        {passwordInput}
        {confirmPasswordInput}

        <Button
          type="submit"
          className="w-full h-11 text-base"
          disabled={isLoading || !email.trim() || !password || !confirmPassword}
        >
          {isLoading ? <>{loadingSpinner} Creating account...</> : 'Create account'}
        </Button>

        <p className="text-center text-sm text-muted-foreground pt-2">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => goToStage('signIn')}
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </button>
        </p>

        {trustBadge}
      </form>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardContent className="pt-8 pb-6 px-6">

          {(stage === 'signIn' || stage === 'signUp') && (
            <div className="text-center mb-8">
              <div className="inline-flex items-start">
                <h1 className="text-2xl font-semibold text-foreground">
                  Baseline
                </h1>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="-mt-0.5 ml-0.5 w-4 h-4 rounded-full border border-primary/40 bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold hover:bg-primary/20 hover:border-primary/60 transition-all"
                        aria-label="About Baseline"
                      >
                        i
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[220px] text-xs">
                      <p>Track health patterns with AI-powered insights. Private, secure, and personalized to you.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-muted-foreground mt-1">
                Know your baseline, spot the changes
              </p>
            </div>
          )}

          {stage === 'signIn' && renderSignIn()}
          {stage === 'signUp' && renderSignUp()}

        </CardContent>
      </Card>
    </div>
  );
}
