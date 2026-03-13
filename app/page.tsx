'use client'

import Link from "next/link"

export default function Home() {

  return (

    <div className="min-h-screen bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500">

      {/* Navbar */}

      <nav className="flex items-center justify-between px-8 py-6 text-white">

        <h1 className="text-2xl font-bold">
          ISP Manager
        </h1>

        <div className="flex gap-4">

          <Link
            href="/login"
            className="px-4 py-2 rounded-lg hover:bg-white/20 transition"
          >
            Login
          </Link>

          <Link
            href="/signup"
            className="px-4 py-2 rounded-lg bg-white text-indigo-600 font-semibold hover:bg-gray-100 transition"
          >
            Get Started
          </Link>

        </div>

      </nav>



      {/* Hero Section */}

      <section className="flex flex-col items-center justify-center text-center text-white px-6 py-24">

        <h1 className="text-5xl font-bold max-w-3xl leading-tight">
          Manage Your ISP Clients  
          <span className="block">
            Simple, Fast & Powerful
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-lg opacity-90">
          A modern platform to manage clients, packages, billing,
          and revenue for your Internet Service Provider business.
        </p>

        <div className="flex gap-4 mt-8">

          <Link
            href="/signup"
            className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Start Free
          </Link>

          <Link
            href="/login"
            className="px-6 py-3 border border-white rounded-lg hover:bg-white/20 transition"
          >
            Login
          </Link>

        </div>

      </section>



      {/* Features */}

      <section className="bg-white py-20 px-8">

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">

          <div className="p-6 rounded-xl shadow hover:shadow-lg transition">

            <h3 className="text-xl font-semibold mb-2">
              Client Management
            </h3>

            <p className="text-gray-600">
              Easily add, manage and track all your ISP clients in one place.
            </p>

          </div>


          <div className="p-6 rounded-xl shadow hover:shadow-lg transition">

            <h3 className="text-xl font-semibold mb-2">
              Packages & Billing
            </h3>

            <p className="text-gray-600">
              Manage internet packages, billing cycles and subscription plans.
            </p>

          </div>


          <div className="p-6 rounded-xl shadow hover:shadow-lg transition">

            <h3 className="text-xl font-semibold mb-2">
              Revenue Tracking
            </h3>

            <p className="text-gray-600">
              Track revenue, expired clients and active subscriptions easily.
            </p>

          </div>

        </div>

      </section>



      {/* Footer */}

      <footer className="text-center text-white py-6 opacity-80">

        <p>
          © {new Date().getFullYear()} ISP Manager. All rights reserved.
        </p>

      </footer>

    </div>

  )
}