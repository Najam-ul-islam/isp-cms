'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, Wifi, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false })

  // Validation
  const emailError = touched.email && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? 'Please enter a valid email address'
    : ''
  
  const passwordError = touched.password && password && password.length < 6
    ? 'Password must be at least 6 characters'
    : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Mark all fields as touched
    setTouched({ email: true, password: true })

    // Client-side validation
    if (!email || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      })

      if (res.ok) {
        const data = await res.json();
        setSuccess('Login successful! Redirecting...');
        
        // Store user info temporarily until cookies are fully set
        if (typeof window !== 'undefined') {
          // Clear any old localStorage tokens (we're using cookies now)
          localStorage.removeItem('token');
          
          // Store user info for immediate display after redirect
          if (data.admin) {
            sessionStorage.setItem('pendingUser', JSON.stringify(data.admin));
          }
        }

        // Small delay to ensure cookies are set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force a full page reload to ensure cookies are sent with the new request
        window.location.href = redirect;
      } else {
        const data = await res.json()
        setError(data.error || 'Invalid email or password')
      }
    } catch (err) {
      setError('Unable to connect. Please check your internet connection and try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 px-4 py-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
            <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl group-hover:bg-white/30 transition-all duration-300 shadow-lg group-hover:shadow-xl border border-white/30">
              <Wifi className="w-10 h-10 text-white drop-shadow-lg" strokeWidth={2.5} />
            </div>
          </Link>
          <h1 className="text-4xl font-extrabold text-white mb-3 drop-shadow-lg">Welcome Back</h1>
          <p className="text-white/90 text-lg font-medium">Sign in to your account to continue</p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 space-y-6 border border-white/20 dark:border-gray-700/50">
          {/* Error/Success Messages */}
          {error && (
            <div
              className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300"
              role="alert"
              aria-live="polite"
            >
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
              <p className="text-base font-medium text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {success && (
            <div
              className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
              <p className="text-base font-medium text-emerald-700 dark:text-emerald-300">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <Input
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              disabled={loading}
              error={emailError || (touched.email && !email ? 'Email is required' : '')}
              leftIcon={<Mail className="w-6 h-6" strokeWidth={2.5} />}
              autoComplete="email"
              required
              aria-required="true"
            />

            {/* Password */}
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                disabled={loading}
                error={passwordError || (touched.password && !password ? 'Password is required' : '')}
                leftIcon={<Lock className="w-6 h-6" strokeWidth={2.5} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-all duration-200 disabled:opacity-50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-6 h-6" strokeWidth={2.5} /> : <Eye className="w-6 h-6" strokeWidth={2.5} />}
                  </button>
                }
                autoComplete="current-password"
                required
                aria-required="true"
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="h-5 w-5 rounded-lg border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 focus:ring-2 cursor-pointer disabled:opacity-50 transition-all"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-3 block text-base text-gray-700 dark:text-gray-200 cursor-pointer select-none font-medium"
                >
                  Remember me
                </label>
              </div>
              <a
                href="#"
                className="text-base text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold hover:underline transition-all"
              >
                Forgot password?
              </a>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              loading={loading}
              className="w-full h-13 text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300"
              size="lg"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="text-center text-base text-gray-600 dark:text-gray-400 font-medium">
            Don't have an account?{' '}
            <Link
              href="/signup"
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-all text-lg"
            >
              Sign up
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-base text-white/80 mt-8 font-medium">
          © {new Date().getFullYear()} ISP Manager. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
