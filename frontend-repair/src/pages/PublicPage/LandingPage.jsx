import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Wrench,
  UserCheck,
  DollarSign,
  Package,
  Building2,
  FileText,
  Check,
  ChevronRight,
  Star,
  Users,
  Smartphone,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  Menu,
  X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CONTACT_INFO } from "./ContactPage";

export function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "SUPER_ADMIN") {
        navigate("/super-admin/businesses", { replace: true });
      } else if (user.role === "OWNER" || user.role === "ADMIN") {
        navigate("/branch/portal", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const [billingPeriod, setBillingPeriod] = useState("monthly"); // monthly or yearly
  const [activeTab, setActiveTab] = useState("checkin"); // checkin, review, handover

  const features = [
    {
      title: "Intake & Repair Tracking",
      desc: "Log device characteristics, IMEI numbers, conditions, and customer profiles quickly on intake.",
      icon: Wrench,
      bg: "bg-blue-50 text-blue-600 border-blue-100"
    },
    {
      title: "Workload-based Assigning",
      desc: "Monitor active workloads and assign tickets to branch technicians without operational overlap.",
      icon: UserCheck,
      bg: "bg-indigo-50 text-indigo-600 border-indigo-100"
    },
    {
      title: "Automated Estimates",
      desc: "Calculate parts cost, add labor charges, and request official customer approval to resume work.",
      icon: DollarSign,
      bg: "bg-yellow-50 text-yellow-600 border-yellow-100"
    },
    {
      title: "Inventory & Spare Parts",
      desc: "Real-time stock level alerts, automated parts consumption tracking, and SKU lookups.",
      icon: Package,
      bg: "bg-emerald-50 text-emerald-600 border-emerald-100"
    },
    {
      title: "Custom Branch Portals",
      desc: "Owners can customize logo, titles, slogans, and coordinates for branch-specific portals.",
      icon: Building2,
      bg: "bg-purple-50 text-purple-600 border-purple-100"
    },
    {
      title: "Invoices & Ledger Logs",
      desc: "Generate tax-compliant invoices, apply discount codes, collect payments, and track outstanding ledger balances.",
      icon: FileText,
      bg: "bg-rose-50 text-rose-600 border-rose-100"
    }
  ];

  const workflowSteps = {
    checkin: {
      title: "1. Device & Check-in",
      heading: "Log Device Conditions Instantly",
      description: "When a customer brings in a device, record details (brand, model, serial/IMEI, and aesthetic conditions). Gather details directly on a responsive intake screen optimized for mobile technicians.",
      tip: "Collect customer signatures or device codes to secure shop custody status.",
      badge: "Intake Step"
    },
    review: {
      title: "2. Assign & Quality Review",
      heading: "Technician Assignment & QA Review",
      description: "Assign the intake ticket to a technician. Once the repair is completed, admins inspect the final item, check actual costs vs invoices, and approve for delivery or send back for rework.",
      tip: "QA checkpoints prevent premature invoicing errors and ensure high quality.",
      badge: "Quality Check"
    },
    handover: {
      title: "3. Payment & Handover",
      heading: "Invoice, Payment & Safe Release",
      description: "Compile parts cost and labor charges, apply local taxes or discounts, collect payments, and log device deliveries directly to the custody log database to safely release the device.",
      tip: "Closed tickets are automatically recorded in monthly analytics summaries.",
      badge: "Handover Step"
    }
  };

  const pricingPlans = [
    {
      name: "Starter Plan",
      desc: "Ideal for new local repair workshops starting on SaaS.",
      price: billingPeriod === "monthly" ? "₹299" : "₹399",
      features: [
        "2 Branch Location context",
        "First 50 repair devices free",
        "Up to 3 active staff accounts",
        "Standard intake & ticket tracking",
        "Basic invoicing & ledger logs",
        "Email support response within 24 hours"
      ],
      cta: "Start Starter Trial",
      popular: false
    },
    {
      name: "Growth Plan",
      desc: "Best for multi-branch repair businesses and expanding operations.",
      price: billingPeriod === "monthly" ? "₹399" : "₹499",
      features: [
        "Unlimited Branch locations context",
        "Up to 15 active staff accounts",
        "Custom branch landing portals",
        "Real-time technician workload graphs",
        "Automated estimates & email notifications",
        "QA Queues & custody handover logs",
        "Priority live chat support"
      ],
      cta: "Payment Now",
      popular: true
    },
    {
      name: "Enterprise Plan",
      desc: "For large-scale networks requiring integrations and dedicated resources.",
      price: "Custom",
      features: [
        "Unlimited Branches & Staff members",
        "Dedicated database clusters & SSL endpoints",
        "Whitelabel customized client portals",
        "API access & webhooks integrations",
        "24/7 account manager & phone support",
        "Custom SLA guidelines"
      ],
      cta: "Payment Now",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] grid place-items-center text-white font-black shadow-md shadow-blue-100">
              RF
            </div>
            <span className="text-lg font-black tracking-tight bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] bg-clip-text text-transparent">
              RepairFlow SaaS
            </span>
          </Link>

          <nav className="hidden gap-6 md:flex text-sm font-semibold text-slate-500">
            <a href="#features" className="transition-colors hover:text-slate-900">Features</a>
            <a href="#workflow" className="transition-colors hover:text-slate-900">Workflow</a>
            <a href="#pricing" className="transition-colors hover:text-slate-900">Pricing</a>
            <Link to="/contact" className="transition-colors hover:text-slate-900">Contact</Link>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/branch/portal">
                <Button className="h-10 text-xs font-bold gap-1 shadow-md shadow-blue-200">
                  Go to Portal
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button className="h-10 text-xs font-bold px-4 shadow-md shadow-blue-200">
                  Sign In
                </Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 md:hidden transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white px-4 py-4 shadow-lg md:hidden animate-in fade-in slide-in-from-top-5 duration-200">
            <nav className="flex flex-col gap-3 text-sm font-semibold text-slate-600">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Features
              </a>
              <a
                href="#workflow"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Workflow
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Pricing
              </a>
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Contact
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 lg:pt-28 lg:pb-24">
        {/* Soft Background Gradients */}
        <div className="absolute top-0 left-1/4 -z-10 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute top-20 right-1/4 -z-10 h-96 w-96 rounded-full bg-teal-100/30 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">

          {/* SaaS Release Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-600 border border-blue-100 shadow-xs mb-6">
            <Sparkles className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
            Modern Multi-Branch ERP for Repair Shops
          </div>

          {/* Heading */}
          <h1 className="mx-auto max-w-4xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.1]">
            Scale Your Device Repair Network with <span className="bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] bg-clip-text text-transparent">Automated Workflows</span>
          </h1>

          {/* Subheading */}
          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-500 sm:text-lg leading-relaxed">
            Eliminate operational chaos. Manage ticket intakes, technicians workload, spare inventory stock, client portal setups, and payments in one streamlined SaaS application.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/login">
              <Button className="h-12 px-6 text-sm font-bold gap-2 shadow-lg shadow-blue-100">
                Start Your Free Trial
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" className="h-12 px-6 text-sm font-bold">
                Request Custom Demo
              </Button>
            </Link>
          </div>

          {/* Mock Dashboard Representation */}
          <div className="mx-auto mt-16 max-w-5xl rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:p-4">
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50 shadow-inner">

              {/* Fake App Header */}
              <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-white px-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                  <span className="ml-4 text-xs font-bold text-slate-400">app.repairflow-local.io/dashboard</span>
                </div>
                <div className="h-5 w-28 rounded-md bg-slate-100" />
              </div>

              {/* Fake Dashboard Grid UI */}
              <div className="grid gap-4 p-4 text-left sm:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Tickets</p>
                  <p className="mt-1 text-xl font-extrabold text-slate-800">42 Repairs</p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-blue-100 overflow-hidden"><div className="h-full w-3/4 rounded-full bg-blue-500" /></div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved Quotes</p>
                  <p className="mt-1 text-xl font-extrabold text-slate-800">₹3,420.50</p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-emerald-100 overflow-hidden"><div className="h-full w-1/2 rounded-full bg-emerald-500" /></div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ready for Review</p>
                  <p className="mt-1 text-xl font-extrabold text-slate-800">7 Pending QA</p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-yellow-100 overflow-hidden"><div className="h-full w-1/4 rounded-full bg-yellow-500" /></div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch Utilization</p>
                  <p className="mt-1 text-xl font-extrabold text-slate-800">92.4% Active</p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-purple-100 overflow-hidden"><div className="h-full w-5/6 rounded-full bg-purple-500" /></div>
                </div>
              </div>

              {/* Fake Table */}
              <div className="px-4 pb-4">
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                  <div className="border-b border-slate-100 px-4 py-3 font-bold text-xs text-slate-700 bg-slate-50">
                    Technician Workload & Operations
                  </div>
                  <div className="p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                      <span className="font-semibold text-slate-800">Main Service Center</span>
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-bold text-blue-600 border border-blue-100">12 Active Repairs</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                      <span className="font-semibold text-slate-800">Bhilai Retail Outlet</span>
                      <span className="rounded-full bg-purple-50 px-2.5 py-0.5 font-bold text-purple-600 border border-purple-100">8 Active Repairs</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">UAT Testing Branch</span>
                      <span className="rounded-full bg-slate-50 px-2.5 py-0.5 font-bold text-slate-500 border border-slate-100">0 Active Repairs</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-white border-y border-slate-200/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="text-center">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest">Built-In Utilities</h2>
            <p className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Everything required to operate your shops</p>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-500">
              Manage repairs, quotes, technicians, and invoice balances. Standardize quality control workflows across all branches seamlessly.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="group relative rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all hover:bg-white hover:shadow-lg hover:border-slate-300">
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${feature.bg} shadow-sm font-semibold`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Interactive Workflow Section */}
      <section id="workflow" className="py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="text-center">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest">ERP Steps Visualizer</h2>
            <p className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">The standard repair shop lifecycle</p>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-500">
              Select steps below to see how RepairFlow guides shop staff through operational tasks step by step.
            </p>
          </div>

          {/* Interactive Steps Tabs */}
          <div className="mt-12 flex flex-wrap justify-center gap-2">
            {Object.keys(workflowSteps).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`rounded-full px-4 py-2 text-xs font-bold border transition-all ${activeTab === key
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
              >
                {workflowSteps[key].title}
              </button>
            ))}
          </div>

          {/* Tab Content Card */}
          <div className="mx-auto mt-8 max-w-3xl">
            <Card className="border-slate-200 shadow-md overflow-hidden">
              <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start justify-between">
                <div className="space-y-4">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600 border border-blue-100">
                    {workflowSteps[activeTab].badge}
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900">{workflowSteps[activeTab].heading}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{workflowSteps[activeTab].description}</p>

                  <div className="rounded-lg bg-slate-50 border border-slate-200/60 p-3 text-xs text-slate-600 leading-normal">
                    <strong>Pro tip:</strong> {workflowSteps[activeTab].tip}
                  </div>
                </div>

                <div className="shrink-0 w-full md:w-auto mt-4 md:mt-0">
                  <div className="h-32 w-32 rounded-2xl bg-[linear-gradient(135deg,#e0f2fe,#ccfbf1)] grid place-items-center text-[linear-gradient(135deg,#1769aa,#0f9f8f)] shadow-inner">
                    <Building2 className="h-12 w-12 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white border-y border-slate-200/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="text-center">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest">Pricing Structure</h2>
            <p className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Transparent, predictable pricing plans</p>

            {/* Billing Period Toggle */}
            <div className="mt-6 inline-flex rounded-full bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${billingPeriod === "monthly" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500"
                  }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${billingPeriod === "yearly" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500"
                  }`}
              >
                Yearly Billing (20% Off)
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="mt-14 grid gap-8 md:grid-cols-3 items-stretch">
            {pricingPlans.map((plan, idx) => (
              <Card key={idx} className={`relative border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden ${plan.popular ? 'border-2 border-blue-500 shadow-md md:-translate-y-2' : ''}`}>

                {plan.popular && (
                  <div className="absolute top-0 right-0 rounded-bl-lg bg-blue-500 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <CardContent className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                    <p className="mt-2 text-xs text-slate-500">{plan.desc}</p>

                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                      {plan.price !== "Custom" && (
                        <span className="text-xs text-slate-500">/ {billingPeriod === "monthly" ? "mo" : "yr"}</span>
                      )}
                    </div>

                    <hr className="my-6 border-slate-100" />

                    <ul className="space-y-3">
                      {plan.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex gap-2 items-start text-xs text-slate-600 leading-normal">
                          <Check className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8">
                    <Link to="/login">
                      <Button variant={plan.popular ? "primary" : "secondary"} className="w-full h-11 text-xs font-bold">
                        {plan.cta}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="text-center">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest">Customer Feedback</h2>
            <p className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Trusted by repair professionals worldwide</p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

            <Card className="border-slate-200/60 shadow-sm bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-0.5 text-yellow-400">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "RepairFlow transformed our invoicing entirely. We no longer lose track of which technician consumed screen assemblies or how much labor charge was quoted."
                </p>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Vikram S.</h4>
                  <p className="text-[10px] text-slate-400">Owner, Bhilai Phone Care Hub</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/60 shadow-sm bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-0.5 text-yellow-400">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "The custom branch portals feature is fantastic! I was able to customize branding for all 4 locations in under 10 minutes. Our branch admins love landing on them."
                </p>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Aisha K.</h4>
                  <p className="text-[10px] text-slate-400">Managing Director, TechRepair Group</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/60 shadow-sm bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-0.5 text-yellow-400">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "Workload graphs allow me to assign incoming tickets evenly. Technicians are happier, turnaround times dropped by 30%, and client trust is at an all-time high."
                </p>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">James L.</h4>
                  <p className="text-[10px] text-slate-400">Operations Manager, QuickFix Network</p>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 text-slate-500 text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] grid place-items-center text-white font-black">
              RF
            </div>
            <span className="font-extrabold text-slate-800">RepairFlow ERP</span>
          </div>

          <p className="text-center text-slate-400">
            &copy; {new Date().getFullYear()} RepairFlow Inc. All rights reserved. Built for local repair shops & startup scales.
          </p>

          <div className="flex gap-4">
            <Link to="/contact" className="hover:text-slate-900 transition-colors font-bold">Contact Support</Link>
            <a href={CONTACT_INFO.socials.linkedin} target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors">LinkedIn</a>
            <a href={CONTACT_INFO.socials.instagram} target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors">Instagram</a>
            <a href={CONTACT_INFO.socials.facebook} target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors">Facebook</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
