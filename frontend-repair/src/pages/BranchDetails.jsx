import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  MapPin,
  Mail,
  Phone,
  Sparkles,
  ExternalLink,
  Laptop
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { QueryState } from "@/components/ui/QueryState";
import { useToast } from "@/contexts/ToastContext";
import { branchesApi } from "@/services/modules";

export function BranchDetails() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["branches", id],
    queryFn: () => branchesApi.get(id),
    enabled: Boolean(id)
  });

  const branch = data?.data?.branch;

  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm({
    values: useMemo(() => {
      if (!branch) return {};
      const metadata = branch.metadata || {};
      const socialLinks = metadata.socialLinks || {};
      return {
        name: branch.name || "",
        phone: branch.phone || "",
        email: branch.email || "",
        address: branch.address || "",
        logo: metadata.logo || "",
        title: metadata.title || "",
        slogan: metadata.slogan || "",
        heading: metadata.heading || "",
        heroContent: metadata.heroContent || "",
        facebook: socialLinks.facebook || "",
        instagram: socialLinks.instagram || "",
        twitter: socialLinks.twitter || "",
        linkedin: socialLinks.linkedin || ""
      };
    }, [branch])
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => branchesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches", id] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch configuration saved successfully!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update branch.");
    }
  });

  // Watch form fields for real-time live preview
  const watchedName = watch("name", "");
  const watchedLogo = watch("logo", "");
  const watchedTitle = watch("title", "");
  const watchedSlogan = watch("slogan", "");
  const watchedHeading = watch("heading", "");
  const watchedHeroContent = watch("heroContent", "");
  const watchedAddress = watch("address", "");
  const watchedPhone = watch("phone", "");
  const watchedEmail = watch("email", "");
  const watchedFacebook = watch("facebook", "");
  const watchedInstagram = watch("instagram", "");
  const watchedTwitter = watch("twitter", "");
  const watchedLinkedin = watch("linkedin", "");

  const onSave = async (values) => {
    const payload = {
      name: values.name.trim(),
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      address: values.address.trim() || null,
      metadata: {
        logo: values.logo.trim() || null,
        title: values.title.trim() || null,
        slogan: values.slogan.trim() || null,
        heading: values.heading.trim() || null,
        heroContent: values.heroContent.trim() || null,
        socialLinks: {
          facebook: values.facebook.trim() || null,
          instagram: values.instagram.trim() || null,
          twitter: values.twitter.trim() || null,
          linkedin: values.linkedin.trim() || null
        }
      }
    };
    await updateMutation.mutateAsync(payload);
  };

  return (
    <div className="mx-auto max-w-6xl min-w-0">
      <PageHeader
        title="Branch Custom Branding"
        description="Set up branch portals, custom layouts, logos, headers, slogans, and social links."
        actions={
          <Link to="/branches">
            <Button variant="secondary" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Branches
            </Button>
          </Link>
        }
      />

      <QueryState isLoading={isLoading} error={error} onRetry={refetch}>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          
          {/* Settings Form Card */}
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Sparkles className="h-5 w-5 text-blue-500" />
                Portal Configurations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSave)} className="space-y-6">
                
                {/* Basic Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Basic Information</h3>
                  <Field label="Branch Name">
                    <Input {...register("name", { required: true })} placeholder="e.g. Bhilai Main Hub" />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Phone">
                      <Input {...register("phone")} placeholder="e.g. +91 9876543210" />
                    </Field>
                    <Field label="Email">
                      <Input {...register("email")} type="email" placeholder="e.g. bhilai@shop.com" />
                    </Field>
                  </div>
                  <Field label="Branch Address">
                    <Textarea {...register("address")} placeholder="Full address of this branch" rows={2} />
                  </Field>
                </div>

                <hr className="border-slate-100" />

                {/* Branding Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Branding & Hero Content</h3>
                  <Field label="Logo Image URL">
                    <Input {...register("logo")} placeholder="e.g. https://domain.com/logo.png" />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Brand Title / Header Logo Text">
                      <Input {...register("title")} placeholder="e.g. TechFix Bhilai" />
                    </Field>
                    <Field label="Slogan / Catchphrase">
                      <Input {...register("slogan")} placeholder="e.g. Premium repair services in 60 mins" />
                    </Field>
                  </div>
                  <Field label="Welcome Heading">
                    <Input {...register("heading")} placeholder="e.g. Welcome to Bhilai's Best Device Repair Hub" />
                  </Field>
                  <Field label="Hero Content / Description">
                    <Textarea {...register("heroContent")} placeholder="Describe your services, speed, warranties, etc." rows={3} />
                  </Field>
                </div>

                <hr className="border-slate-100" />

                {/* Social Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Social Links</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Facebook URL">
                      <Input {...register("facebook")} placeholder="https://facebook.com/..." />
                    </Field>
                    <Field label="Instagram URL">
                      <Input {...register("instagram")} placeholder="https://instagram.com/..." />
                    </Field>
                    <Field label="Twitter / X URL">
                      <Input {...register("twitter")} placeholder="https://twitter.com/..." />
                    </Field>
                    <Field label="LinkedIn URL">
                      <Input {...register("linkedin")} placeholder="https://linkedin.com/..." />
                    </Field>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={isSubmitting || updateMutation.isPending}>
                  {isSubmitting || updateMutation.isPending ? "Saving Configurations..." : "Save Portal Configurations"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Live Mobile Mockup Preview */}
          <div className="flex flex-col items-center">
            <div className="sticky top-20 w-full max-w-[370px]">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>Live Portal Preview</span>
                <span className="flex items-center gap-1.5 text-blue-500 font-medium normal-case bg-blue-50 px-2 py-0.5 rounded-full">
                  <Laptop className="h-3.5 w-3.5" /> Mobile Mockup
                </span>
              </div>
              
              {/* Phone Mockup Frame */}
              <div className="relative mx-auto h-[680px] w-full max-w-[360px] overflow-hidden rounded-[40px] border-[12px] border-slate-900 bg-slate-950 shadow-2xl">
                
                {/* Camera Notch */}
                <div className="absolute top-0 left-1/2 z-40 h-5 w-32 -translate-x-1/2 rounded-b-xl bg-slate-900" />
                
                {/* Screen Content */}
                <div className="h-full overflow-y-auto bg-slate-50 text-slate-800 antialiased scrollbar-none">
                  
                  {/* Mock Portal Header */}
                  <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-white/80 px-4 py-2 border-b border-slate-100 backdrop-blur-md">
                    <div className="flex items-center gap-1.5">
                      {watchedLogo ? (
                        <img src={watchedLogo} alt="Logo" className="h-6 w-6 rounded-md object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="h-6 w-6 rounded-md bg-blue-600 grid place-items-center text-white text-[10px] font-black">
                          {watchedTitle ? watchedTitle.substring(0, 2).toUpperCase() : (watchedName ? watchedName.substring(0,2).toUpperCase() : "BR")}
                        </div>
                      )}
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                        {watchedTitle || watchedName || "Branch Brand"}
                      </span>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600 border border-emerald-100 animate-pulse">
                      Active Portal
                    </span>
                  </header>

                  {/* Mock Portal Body */}
                  <div className="px-4 py-5">
                    
                    {/* Welcome Badge */}
                    <div className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600 border border-blue-100">
                      <Sparkles className="h-3 w-3 text-blue-500" />
                      Branch Landing Portal
                    </div>

                    {/* Heading & Slogan */}
                    <h2 className="mt-3 text-lg font-black text-slate-900 leading-snug">
                      {watchedHeading || `Welcome to ${watchedName || "Our Branch"}`}
                    </h2>
                    {watchedSlogan ? (
                      <p className="mt-1 text-xs font-semibold text-blue-600 italic">
                        "{watchedSlogan}"
                      </p>
                    ) : null}

                    {/* Hero Content */}
                    <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                      {watchedHeroContent || "Configure your branch details in the settings panel to customize this landing page. Add slogans, descriptions, and active social profiles."}
                    </p>

                    {/* Action Button */}
                    <div className="mt-6">
                      <button type="button" className="w-full rounded-xl bg-blue-600 py-2.5 text-center text-xs font-bold text-white shadow-md shadow-blue-200">
                        Enter Operations Dashboard
                      </button>
                    </div>

                    <hr className="my-6 border-slate-200" />

                    {/* Contact & Location Block */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Reach Us Directly</h4>
                      
                      <div className="flex gap-2 items-start text-xs">
                        <MapPin className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-700">Address</p>
                          <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                            {watchedAddress || "No address set"}
                          </p>
                        </div>
                      </div>

                      {watchedPhone ? (
                        <div className="flex gap-2 items-center text-xs">
                          <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                          <div>
                            <p className="font-semibold text-slate-700">Phone: <span className="font-normal text-slate-500 text-[11px]">{watchedPhone}</span></p>
                          </div>
                        </div>
                      ) : null}

                      {watchedEmail ? (
                        <div className="flex gap-2 items-center text-xs">
                          <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                          <div>
                            <p className="font-semibold text-slate-700">Email: <span className="font-normal text-slate-500 text-[11px] truncate max-w-[180px] inline-block align-bottom">{watchedEmail}</span></p>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Social links */}
                    {(watchedFacebook || watchedInstagram || watchedTwitter || watchedLinkedin) ? (
                      <div className="mt-6">
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">Follow Our Updates</h4>
                        <div className="flex gap-2">
                          {watchedFacebook && (
                            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                              <Facebook className="h-4 w-4" />
                            </div>
                          )}
                          {watchedInstagram && (
                            <div className="h-8 w-8 rounded-lg bg-pink-50 text-pink-600 border border-pink-100 flex items-center justify-center">
                              <Instagram className="h-4 w-4" />
                            </div>
                          )}
                          {watchedTwitter && (
                            <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
                              <Twitter className="h-4 w-4" />
                            </div>
                          )}
                          {watchedLinkedin && (
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                              <Linkedin className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}

                  </div>
                </div>

                {/* Speaker pill mock */}
                <div className="absolute top-[3px] left-1/2 z-50 h-[3px] w-16 -translate-x-1/2 rounded-full bg-slate-800" />
              </div>
            </div>
          </div>

        </div>
      </QueryState>
    </div>
  );
}
