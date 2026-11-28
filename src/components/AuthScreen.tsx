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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [preferredChannel, setPreferredChannel] = useState('in_app');
  const [preferredContactTime, setPreferredContactTime] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [proactiveContactConsent, setProactiveContactConsent] = useState(false);
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
              phone_number: phoneNumber.trim(),
              preferred_language: preferredLanguage,
              preferred_channel: preferredChannel,
              preferred_contact_time: preferredContactTime,
              privacy_consent: privacyConsent,
              proactive_contact_consent: proactiveContactConsent,
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

      if (normalizedMessage.includes('privacy consent is required')) {
        setError('Please agree to the account and farm information notice to create your account.');
      } else if (normalizedMessage.includes('phone number must use international format')) {
        setError('Enter your phone number in international format, for example +2567XXXXXXXX.');
      } else if (normalizedMessage.includes('whatsapp contact requires a phone number and consent')) {
        setError('WhatsApp updates need your phone number and your permission.');
      } else if (normalizedMessage.includes('a valid cooperative code is required')) {
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
            <p className="text-sm text-soil-500">Farm guidance, made simple.</p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-soil-900">
          {mode === 'register' ? 'Join Omulimi' : 'Welcome back'}
        </h2>
        <p className="text-sm text-soil-500 mt-2 mb-6">
          {mode === 'register'
            ? 'Use your cooperative code to register.'
            : 'Sign in to open your farm.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-soil-800 mb-1">
                  Your name
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
                  Cooperative code
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

          {mode === 'register' && (
            <>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-soil-800 mb-1">
                  Phone number (optional)
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  required={preferredChannel === 'whatsapp'}
                  pattern="^\\+[1-9][0-9]{7,14}$"
                  title="Use international format, for example +2567XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border border-leaf-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-leaf-500"
                  placeholder="+2567XXXXXXXX"
                />
                <p className="mt-1 text-xs text-soil-500">Use the international format if you want WhatsApp updates.</p>
              </div>

              <div>
                <label htmlFor="preferredLanguage" className="block text-sm font-medium text-soil-800 mb-1">
                  Preferred language
                </label>
                <select
                  id="preferredLanguage"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full rounded-xl border border-leaf-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-leaf-500"
                >
                  <option value="en">English</option>
                  <option value="lg">Luganda</option>
                  <option value="nyn">Runyankole</option>
                  <option value="cgg">Rukiga</option>
                  <option value="sw">Swahili</option>
                </select>
              </div>

              <div>
                <label htmlFor="preferredChannel" className="block text-sm font-medium text-soil-800 mb-1">
                  How should Omulimi contact you?
                </label>
                <select
                  id="preferredChannel"
                  value={preferredChannel}
                  onChange={(e) => {
                    setPreferredChannel(e.target.value);
                    if (e.target.value === 'none') setProactiveContactConsent(false);
                  }}
                  className="w-full rounded-xl border border-leaf-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-leaf-500"
                >
                  <option value="in_app">Inside Omulimi</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="none">No proactive messages</option>
                </select>
              </div>

              <div>
                <label htmlFor="preferredContactTime" className="block text-sm font-medium text-soil-800 mb-1">
                  Best time to receive updates (optional)
                </label>
                <input
                  id="preferredContactTime"
                  type="time"
                  value={preferredContactTime}
                  onChange={(e) => setPreferredContactTime(e.target.value)}
                  className="w-full rounded-xl border border-leaf-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-leaf-500"
                />
              </div>

              <label className="flex items-start gap-3 text-sm text-soil-700">
                <input
                  type="checkbox"
                  required
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#466b45]"
                />
                <span>I agree that Omulimi can use the farm and account information I provide to deliver farm guidance and operate my account.</span>
              </label>

              <label className="flex items-start gap-3 text-sm text-soil-700">
                <input
                  type="checkbox"
                  required={preferredChannel === 'whatsapp'}
                  disabled={preferredChannel === 'none'}
                  checked={proactiveContactConsent}
                  onChange={(e) => setProactiveContactConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#466b45]"
                />
                <span>I agree to receive proactive farming updates through my selected contact channel. I can change this preference later.</span>
              </label>

            </>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-soil-800 mb-1">
              Email
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
          {mode === 'register' ? 'Have an account?' : 'New to Omulimi?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'register' ? 'login' : 'register');
              setError('');
              setMessage('');
            }}
            className="font-bold text-leaf-700 hover:underline"
          >
            {mode === 'register' ? 'Sign in' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}
