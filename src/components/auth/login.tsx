'use client';

import { useState } from 'react';
import { useLoginWithEmail, usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';
import { Rocket } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { sendCode, loginWithCode } = useLoginWithEmail();
  const { user } = usePrivy();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError('');

    try {
      await sendCode({ email });
      setStep('code');
    } catch (err) {
      setError('Failed to send verification code. Please try again.');
      console.error('Send code error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setIsLoading(true);
    setError('');

    try {
      await loginWithCode({ code });
      // Login successful - user state will be updated automatically
    } catch (err) {
      setError('Invalid verification code. Please try again.');
      console.error('Login with code error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
    setError('');
  };

  if (user) {
    return null; // User is already logged in
  }

  return (
    <div className="min-h-screen flex items-center justify-center  bg-black px-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(220,38,38,0.08),transparent_60%)]"></div>
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-red-600/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-red-500/12 rounded-full blur-2xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-red-900/5 to-transparent rounded-full blur-3xl"></div>
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Character Image Section */}
        <div className="text-center relative">
          <div className="relative w-48 h-48 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/25 to-red-700/35 rounded-full blur-xl animate-pulse"></div>
            <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-red-500/40 bg-gradient-to-br from-red-600/25 to-gray-900/50 backdrop-blur-sm shadow-2xl shadow-red-900/30">
              <Image
                src="/game-assets/ava.png"
                alt="Game Character"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
          
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-white mb-2 tracking-wider drop-shadow-2xl">
              AVALOOT
            </h1>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-red-500/80 to-transparent mx-auto rounded-full"></div>
          </div>
          
        

          {/* Catchy Description */}
          <div className="mb-6">
            <p className="text-gray-300 text-sm leading-relaxed">
              Stake • Explore • Claim
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="mb-6 p-4 bg-red-500/15 border border-red-500/40 rounded-lg backdrop-blur-sm shadow-lg shadow-red-900/20">
              <p className="text-sm text-red-200 font-medium">{error}</p>
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-3">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-4 bg-black border border-gray-700/50 text-white rounded-xl focus:outline-none focus:ring-0 focus:ring-red-500/70 focus:border-red-500/50 transition-all duration-300 placeholder-gray-400 backdrop-blur-sm text-lg shadow-lg shadow-gray-900/50"
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full py-4 px-6 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-500 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/70 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-red-900/60"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Rocket className="w-5 h-5 mr-2" />
                    Play Now
                  </div>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginWithCode} className="space-y-6">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-200 mb-3">
                  Verification Code
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-4 bg-black border border-gray-700/50 text-white rounded-xl focus:outline-none focus:ring-0 focus:ring-red-500/70 focus:border-red-500/50 transition-all duration-300 placeholder-gray-400 backdrop-blur-sm text-center text-xl tracking-widest font-mono shadow-lg shadow-gray-900/50"
                  placeholder="000000"
                  disabled={isLoading}
                  maxLength={6}
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="flex-1 py-4 px-4 border border-gray-700/50 text-gray-200 font-medium rounded-xl bg-gray-900/50 hover:bg-gray-800/60 focus:outline-none focus:ring-2 focus:ring-gray-500/70 transition-all duration-300 backdrop-blur-sm shadow-lg shadow-gray-900/40"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !code}
                  className="flex-1 py-4 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-500 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/70 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-red-900/60"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Verifying...
                    </div>
                  ) : (
                    'Enter Arena'
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-sm text-gray-400">
                  Code sent to: <span className="font-medium text-gray-200">{email}</span>
                </p>
              </div>
            </form>
          )}
        </div>
        
        
      </div>
    </div>
  );
}
