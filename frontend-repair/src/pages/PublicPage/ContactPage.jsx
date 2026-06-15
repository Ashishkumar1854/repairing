import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  Send,
  Linkedin,
  Instagram,
  Facebook,
  Check,
  Menu,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { superAdminApi } from "@/services/modules";

// Centralized contact coordinates and social media links
export const CONTACT_INFO = {
  address: "Kurud, Bhilai, Chhattisgarh, India",
  phone: "7294059348",
  email: "ashishkyadav.dev@gmail.com",
  socials: {
    linkedin: "https://linkedin.com/in/ashishkyadav-dev",
    instagram: "https://instagram.com/ashishkyadav.dev",
    facebook: "https://facebook.com/ashishkyadav.dev"
  }
};

export function ContactPage() {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    shopName: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.message) return;

    setIsSubmitting(true);
    try {
      await superAdminApi.submitContactRequest({
        name: formData.name,
        phone: formData.phone,
        shopName: formData.shopName,
        message: formData.message,
      });
      setIsSuccess(true);
      setFormData({ name: "", phone: "", shopName: "", message: "" });
    } catch (err) {
      console.error("Failed to submit contact request", err);
      alert("Something went wrong while submitting request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans flex flex-col justify-between">
      
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
            <Link to="/#features" className="transition-colors hover:text-slate-900">Features</Link>
            <Link to="/#workflow" className="transition-colors hover:text-slate-900">Workflow</Link>
            <Link to="/#pricing" className="transition-colors hover:text-slate-900">Pricing</Link>
            <Link to="/contact" className="text-blue-600 font-bold transition-colors">Contact</Link>
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
              <Link
                to="/#features"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Features
              </Link>
              <Link
                to="/#workflow"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Workflow
              </Link>
              <Link
                to="/#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Pricing
              </Link>
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-blue-600 bg-blue-50/50 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Contact
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main Contact Section */}
      <main className="flex-1 py-16 lg:py-24 relative overflow-hidden">
        {/* Soft background glow circles */}
        <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 -z-10 h-96 w-96 rounded-full bg-teal-100/30 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header Title */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1 text-[10px] font-bold text-blue-600 border border-blue-100 shadow-xs mb-4 uppercase tracking-widest">
              Get in Touch
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-none">
              We're Here to Help <span className="bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] bg-clip-text text-transparent">Your Business Grow</span>
            </h1>
            <p className="mt-4 text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
              Have questions about RepairFlow, custom pricing, branch management integrations, or setting up technician workflows? Drop us a message!
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-12 items-start">
            {/* Left Coordinates Panel */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Coordinates Card */}
              <Card className="border-slate-200 bg-white/70 backdrop-blur-md shadow-md rounded-2xl p-6 space-y-6">
                <h3 className="text-md font-extrabold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider">
                  Contact Information
                </h3>

                <div className="space-y-4">
                  {/* Phone */}
                  <div className="flex gap-4 items-start">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-sm">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Call Us</p>
                      <a href={`tel:${CONTACT_INFO.phone}`} className="text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors">
                        +91 {CONTACT_INFO.phone}
                      </a>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex gap-4 items-start">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                      <a href={`mailto:${CONTACT_INFO.email}`} className="text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors break-all">
                        {CONTACT_INFO.email}
                      </a>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex gap-4 items-start">
                    <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0 shadow-sm">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Office Address</p>
                      <p className="text-sm font-bold text-slate-800 leading-normal">
                        {CONTACT_INFO.address}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Social Channels Card */}
              <Card className="border-slate-200 bg-white/70 backdrop-blur-md shadow-md rounded-2xl p-6">
                <h3 className="text-md font-extrabold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider mb-4">
                  Connect With Us
                </h3>
                <div className="flex gap-4">
                  {/* LinkedIn */}
                  <a
                    href={CONTACT_INFO.socials.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 shadow-sm transition-all"
                    title="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>

                  {/* Instagram */}
                  <a
                    href={CONTACT_INFO.socials.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 shadow-sm transition-all"
                    title="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>

                  {/* Facebook */}
                  <a
                    href={CONTACT_INFO.socials.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-800 hover:bg-blue-50 hover:border-blue-200 shadow-sm transition-all"
                    title="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                </div>
              </Card>

            </div>

            {/* Right Contact Form Panel */}
            <div className="lg:col-span-7">
              <Card className="border-slate-200 bg-white shadow-lg rounded-2xl overflow-hidden p-6 sm:p-8">
                {isSuccess ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shadow-inner">
                      <Check className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900">Request Sent Successfully!</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      Thank you for your interest in RepairFlow ERP. Our onboarding team will call or text your mobile number within 24 hours to help set up your shop's portal.
                    </p>
                    <div className="pt-4">
                      <Button variant="secondary" onClick={() => setIsSuccess(false)} className="text-xs font-bold px-5">
                        Submit Another Request
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <h3 className="text-md font-extrabold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wider mb-2">
                      Request a Callback / Demo
                    </h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={<span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Owner / Manager Name <span className="text-red-500">*</span></span>}>
                        <Input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Your full name"
                          required
                          className="mt-1 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-xs h-11"
                        />
                      </Field>

                      <Field label={<span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Mobile Number <span className="text-red-500">*</span></span>}>
                        <Input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="e.g. 7294059348"
                          required
                          className="mt-1 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-xs h-11"
                        />
                      </Field>
                    </div>

                    <Field label={<span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Shop Name <span className="text-red-500">*</span></span>}>
                      <Input
                        type="text"
                        name="shopName"
                        value={formData.shopName}
                        onChange={handleInputChange}
                        placeholder="e.g. Bhilai Mobile Care / QuickFix Auto Garage / Royal Car Repair"
                        required
                        className="mt-1 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-xs h-11"
                      />
                    </Field>

                    <Field label={<span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Shop Details / Special Needs</span>}>
                      <Textarea
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        placeholder="Describe your shop operations (e.g. mobile/laptop repair, car servicing, parts inventory volume, number of technicians/branches, etc.)"
                        required
                        className="mt-1 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-xs min-h-32"
                      />
                    </Field>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 text-xs font-black bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] text-white border-none shadow-lg shadow-blue-200/50 hover:brightness-95 transition-all mt-6 rounded-lg cursor-pointer flex gap-2"
                    >
                      {isSubmitting ? "Sending request..." : "Submit Callback Request"}
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>

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
            <Link to="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Link to="/contact" className="hover:text-slate-900 transition-colors font-bold">Contact Support</Link>
            <a href={CONTACT_INFO.socials.linkedin} target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
