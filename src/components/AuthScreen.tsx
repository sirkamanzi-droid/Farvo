import type { FormEvent } from 'react';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sprout, Loader2, Eye, EyeOff } from 'lucide-react';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cooperativeCode, setCooperativeCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
        data: {
              full_name: fullName.trim(),
              cooperative_code: cooperativeCode.trim().toUpperCase(),
            },
          },
        });

        if (signUpError) throw signUpError;

        // Supabase may return an empty identities array for an existing email
        // instead of an error, to avoid revealing whether an account exists.
        // Treat that response as a duplicate registration, never as success.
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          throw new Error('User already registered');
        }

        if (data.session) {
          setMessage('Account created successfully. Opening Omulimi…');
        } else {
          setMessage(
            'Registration received. Check your email to verify your account, then sign in.'
          );
          setMode('login');
        }
      } else {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (signInError) throw signInError;
        setMessage('Signed in successfully. Opening Omulimi…');
      }
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : '';
      const normalizedMessage = rawMessage.toLowerCase();

      if (normalizedMessage.includes('a valid cooperative code is required')) {
        setError('That cooperative code is invalid or inactive. Please check it with your cooperative.');
      } else if (normalizedMessage.includes('full name is required')) {
        setError('Please enter your full name.');
      } else if (
        normalizedMessage.includes('user already registered') ||
        normalizedMessage.includes('already been registered')
      ) {
        setError('This email already has an account. Sign in with your existing password instead.');
        setMode('login');
      } else if (normalizedMessage.includes('invalid login credentials')) {
        setError('The email or password is incorrect.');
      } else if (normalizedMessage.includes('email not confirmed')) {
        setError('Please verify your email before signing in.');
      } else {
        setError('We couldn’t complete your request. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-parchment-100 flex items-center justify-center px-4 py-10 font-sans">
      <div className="w-full max-w-md bg-parchment-50 border border-leaf-100 rounded-3xl shadow-lg p-7 sm:p-9">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-leaf-600 text-white rounded-2xl p-3">
            <Sprout className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-soil-900">Omulimi</h1>
            <p className="text-sm text-soil-500">Practical advice for every farm.</p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-soil-900">
          {mode === 'register' ? 'Create your farmer account' : 'Welcome back'}
        </h2>
        <p className="text-sm text-soil-500 mt-2 mb-6">
          {mode === 'register'
            ? 'Register using the access code provided by your cooperative.'
            : 'Sign in to continue to your farm dashboard.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-soil-800 mb-1">
                  Full name
                </label>
                <input
                  id="fullName"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-leaf-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-leaf-500"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label htmlFor="cooperativeCode" className="block text-sm font-medium text-soil-800 mb-1">
                  Cooperative access code
                </label>
                <input
                  id="cooperativeCode"
                  required
                  autoComplete="off"
                  value={cooperativeCode}
                  onChange={(e) => setCooperativeCode(e.target.value)}
                  className="w-full rounded-xl border border-leaf-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-leaf-500"
                  placeholder="Enter your cooperative code"
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-soil-800 mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-leaf-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-leaf-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-soil-800 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-leaf-200 bg-white px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-leaf-500"
                placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-soil-500"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          {message && (
            <p role="status" className="rounded-xl bg-leaf-50 border border-leaf-200 p-3 text-sm text-leaf-800">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-leaf-600 hover:bg-leaf-700 disabled:opacity-60 text-white font-bold py-3 transition"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading
              ? 'Please wait…'
              : mode === 'register'
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-soil-600 mt-6">
          {mode === 'register' ? 'Already registered?' : 'New to Omulimi?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'register' ? 'login' : 'register');
              setError('');
              setMessage('');
            }}
            className="font-bold text-leaf-700 hover:underline"
          >
            {mode === 'register' ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </div>
    </div>
  );
}
