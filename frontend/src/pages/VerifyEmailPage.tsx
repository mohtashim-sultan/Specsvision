import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, ArrowRight, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { verifyEmailRequest, resendOtpRequest } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailParam);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(600); // 10 minutes

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];

    if (value.length > 1) {
      // Pasted multi-digit code
      const digits = value.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newOtp[i] = digits[i] || '';
      }
      setOtp(newOtp);
      const nextIdx = Math.min(digits.length, 5);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await verifyEmailRequest(email, code);
      await refreshUser();
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setResending(true);
    setError(null);
    setInfoMessage(null);
    try {
      await resendOtpRequest(email);
      setSecondsLeft(600);
      setOtp(['', '', '', '', '', '']);
      setInfoMessage('A new 6-digit code has been sent to your email.');
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-900 text-slate-100">
      <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 mb-4">
            <Mail className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Check Your Email</h1>
          <p className="text-sm text-slate-300">
            We sent a 6-digit code to{' '}
            <span className="font-semibold text-purple-300">{email || 'your email'}</span>
          </p>
        </div>

        {!emailParam && (
          <div className="mb-6">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
        )}

        {error && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 p-3.5 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center gap-2.5 text-xs text-purple-300">
            <CheckCircle className="w-4 h-4 shrink-0 text-purple-400" />
            <span>{infoMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex justify-between gap-2 sm:gap-3 mb-6" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold bg-slate-900/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all"
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 mb-6">
            <span>
              Expires in: <strong className="text-purple-300 font-mono">{formatTime(secondsLeft)}</strong>
            </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              Resend Code
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || otp.join('').length < 6}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Verify & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Already verified?{' '}
          <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
