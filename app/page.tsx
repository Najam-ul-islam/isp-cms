'use client'

import Link from "next/link"
import { Wifi, Users, CreditCard, TrendingUp, Shield, Zap, ArrowRight, CheckCircle2 } from "lucide-react"

export default function Home() {
  const features = [
    {
      icon: Users,
      title: "Client Management",
      description: "Easily add, manage and track all your ISP clients in one centralized dashboard.",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: CreditCard,
      title: "Packages & Billing",
      description: "Manage internet packages, billing cycles and subscription plans with ease.",
      color: "from-emerald-500 to-emerald-600",
    },
    {
      icon: TrendingUp,
      title: "Revenue Tracking",
      description: "Track revenue, expired clients and active subscriptions in real-time.",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with role-based access control and data protection.",
      color: "from-amber-500 to-amber-600",
    },
    {
      icon: Zap,
      title: "Fast & Responsive",
      description: "Lightning-fast performance built with Next.js and modern database optimization.",
      color: "from-rose-500 to-rose-600",
    },
    {
      icon: Wifi,
      title: "Network Monitoring",
      description: "Monitor client connections, bandwidth usage and network health indicators.",
      color: "from-cyan-500 to-cyan-600",
    },
  ]

  const benefits = [
    "Reduce client management time by 70%",
    "Automated billing and payment tracking",
    "Real-time expiration alerts and notifications",
    "Comprehensive financial reports and insights",
    "Multi-user support with role-based access",
    "Mobile-responsive design for on-the-go access",
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 sm:px-8 lg:px-12 py-5 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl">
            <Wifi className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            ISP Manager
          </h1>
        </div>

        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-4 sm:px-5 py-2 rounded-xl hover:bg-white/10 transition-colors duration-200 text-sm sm:text-base font-medium"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-4 sm:px-5 py-2 rounded-xl bg-white text-indigo-600 font-semibold hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center text-white px-6 py-16 sm:py-20 lg:py-28">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-6 sm:mb-8">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          Trusted by ISPs Worldwide
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold max-w-4xl leading-tight tracking-tight">
          Manage Your ISP Clients
          <span className="block mt-2 bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">
            Simple, Fast & Powerful
          </span>
        </h1>

        <p className="mt-6 sm:mt-8 max-w-2xl text-lg sm:text-xl text-white/90 leading-relaxed">
          A modern platform to manage clients, packages, billing,
          and revenue for your Internet Service Provider business.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-8 sm:mt-10 w-full sm:w-auto">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 text-base"
          >
            Start Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all duration-200 font-semibold text-base backdrop-blur-sm"
          >
            Login to Dashboard
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 mt-12 sm:mt-16 text-sm text-white/80">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            <span>Free to Use</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            <span>No Credit Card Required</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            <span>24/7 Support</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white dark:bg-gray-900 py-16 sm:py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              Everything You Need
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powerful features designed to streamline your ISP operations
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="group p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} text-white mb-4 group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-50 dark:bg-gray-800 py-16 sm:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                Why Choose ISP Manager?
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                Built by ISPs, for ISPs. We understand the challenges you face and provide solutions that work.
              </p>
              
              <div className="mt-8 space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-200 text-base">
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
              <div className="space-y-6">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">70%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Time Saved on Management</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl">
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">100%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Payment Tracking Accuracy</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">24/7</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Real-time Monitoring</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16 sm:py-20 px-6">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to Transform Your ISP Business?
          </h2>
          <p className="mt-4 text-lg text-white/90 max-w-2xl mx-auto">
            Join hundreds of ISPs who trust our platform to manage their clients and grow their business.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 mt-8 px-8 py-3.5 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-600 rounded-xl">
                  <Wifi className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">ISP Manager</span>
              </div>
              <p className="text-sm leading-relaxed">
                The modern platform for managing your Internet Service Provider business efficiently.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/signup" className="hover:text-white transition-colors">Get Started</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
                <li><span className="text-gray-500">Pricing (Coming Soon)</span></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-gray-500">Client Management</span></li>
                <li><span className="text-gray-500">Billing & Payments</span></li>
                <li><span className="text-gray-500">Financial Reports</span></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-gray-500">Documentation</span></li>
                <li><span className="text-gray-500">Contact Us</span></li>
                <li><span className="text-gray-500">FAQ</span></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">
              © {new Date().getFullYear()} ISP Manager. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
