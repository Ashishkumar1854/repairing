import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import {
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  MapPin,
  Mail,
  Phone,
  ArrowRight,
  Sparkles,
  Info,
  Edit2,
  X,
  Check,
  Building
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { useToast } from "@/contexts/ToastContext";
import { branchesApi } from "@/services/modules";

export function BranchPortal() {
  const { user, hasRole } = useAuth();
  const { branches, selectedBranchId, allBranchesValue, refetch: refetchBranches } = useBranch();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);

  // Resolve active branch context
  const activeBranch = useMemo(() => {
    if (hasRole("ADMIN") || hasRole("TECHNICIAN")) {
      return user?.branch;
    }
    if (!selectedBranchId || selectedBranchId === allBranchesValue) {
      return branches.find((b) => b.isMainBranch) || branches[0];
    }
    return branches.find((b) => b.id === selectedBranchId);
  }, [user, branches, selectedBranchId, allBranchesValue, hasRole]);

  const metadata = activeBranch?.metadata || {};
  const socialLinks = metadata.socialLinks || {};

  const name = activeBranch?.name || "Our Service Hub";
  const address = activeBranch?.address || "";
  const phone = activeBranch?.phone || "";
  const email = activeBranch?.email || "";
  
  const logo = metadata.logo || "";
  const title = metadata.title || name;
  const slogan = metadata.slogan || "";
  const heading = metadata.heading || `Welcome to ${name}`;
  const heroContent = metadata.heroContent || "Welcome to your active branch control panel. Use the side navigation to manage customer details, assignments, tickets, and check inventory levels.";

  // Form setup
  const { register, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      logo: "",
      title: "",
      slogan: "",
      heading: "",
      heroContent: "",
      facebook: "",
      instagram: "",
      twitter: "",
      linkedin: ""
    }
  });

  // Reset form whenever activeBranch changes or editing is toggled
  useEffect(() => {
    if (activeBranch) {
      const mb = activeBranch.metadata || {};
      const sl = mb.socialLinks || {};
      reset({
        name: activeBranch.name || "",
        phone: activeBranch.phone || "",
        email: activeBranch.email || "",
        address: activeBranch.address || "",
        logo: mb.logo || "",
        title: mb.title || "",
        slogan: mb.slogan || "",
        heading: mb.heading || "",
        heroContent: mb.heroContent || "",
        facebook: sl.facebook || "",
        instagram: sl.instagram || "",
        twitter: sl.twitter || "",
        linkedin: sl.linkedin || ""
      });
    }
  }, [activeBranch, reset, isEditing]);

  // Watched fields for live preview in edit mode
  const watchedName = watch("name");
  const watchedLogo = watch("logo");
  const watchedTitle = watch("title");
  const watchedSlogan = watch("slogan");
  const watchedHeading = watch("heading");
  const watchedHeroContent = watch("heroContent");
  const watchedAddress = watch("address");
  const watchedPhone = watch("phone");
  const watchedEmail = watch("email");
  const watchedFacebook = watch("facebook");
  const watchedInstagram = watch("instagram");
  const watchedTwitter = watch("twitter");
  const watchedLinkedin = watch("linkedin");

  const updateMutation = useMutation({
    mutationFn: (payload) => branchesApi.update(activeBranch.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      refetchBranches();
      toast.success("Branch configurations updated successfully.");
      setIsEditing(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update branch branding.");
    }
  });

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

  if (!activeBranch) {
    return (
      <div className="grid h-80 place-items-center text-sm text-[var(--muted)]">
        No active branch context. Create a branch first.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl min-w-0">
      
      {/* Header and Controls */}
      <PageHeader
        title={isEditing ? "Customize Branch Portal" : `${name} Portal`}
        description={isEditing ? "Update logo, slogans, headings, phone, address, and social links with real-time live preview." : "Official landing portal for this branch context."}
        actions={
          hasRole("OWNER") && (
            <Button
              variant={isEditing ? "secondary" : "primary"}
              onClick={() => setIsEditing(!isEditing)}
              className="gap-2"
            >
              {isEditing ? (
                <>
                  <X className="h-4 w-4" /> Cancel Editing
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4" /> Edit Portal Settings
                </>
              )}
            </Button>
          )
        }
      />

      {/* Editing Mode Layout */}
      {isEditing ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          
          {/* Edit Form */}
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800">Configurations Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleSubmit(onSave)} className="space-y-5">
                
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Branch Core Info</h4>
                  <Field label="Branch Name">
                    <Input {...register("name", { required: true })} />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Phone">
                      <Input {...register("phone")} />
                    </Field>
                    <Field label="Email">
                      <Input {...register("email")} type="email" />
                    </Field>
                  </div>
                  <Field label="Branch Address">
                    <Textarea {...register("address")} rows={2} />
                  </Field>
                </div>

                <hr className="border-slate-100" />

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Branding & Hero Card</h4>
                  <Field label="Logo Image URL">
                    <Input {...register("logo")} placeholder="e.g. https://domain.com/logo.png" />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Brand / Header Title">
                      <Input {...register("title")} />
                    </Field>
                    <Field label="Slogan / Tagline">
                      <Input {...register("slogan")} />
                    </Field>
                  </div>
                  <Field label="Main Welcome Heading">
                    <Input {...register("heading")} />
                  </Field>
                  <Field label="Hero Content Description">
                    <Textarea {...register("heroContent")} rows={3} />
                  </Field>
                </div>

                <hr className="border-slate-100" />

                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Follow Social Profiles</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Facebook">
                      <Input {...register("facebook")} />
                    </Field>
                    <Field label="Instagram">
                      <Input {...register("instagram")} />
                    </Field>
                    <Field label="Twitter / X">
                      <Input {...register("twitter")} />
                    </Field>
                    <Field label="LinkedIn">
                      <Input {...register("linkedin")} />
                    </Field>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 text-xs font-bold gap-2" disabled={isSubmitting || updateMutation.isPending}>
                  <Check className="h-4 w-4" /> Save Brand Configuration
                </Button>

              </form>
            </CardContent>
          </Card>

          {/* Real-time Preview */}
          <div>
            <h3 className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Live Mockup Preview</h3>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 min-h-[550px] flex flex-col justify-between">
                
                {/* Mock Header */}
                <div className="flex h-12 items-center justify-between border-b border-slate-100 bg-white px-4">
                  <div className="flex items-center gap-1.5">
                    {watchedLogo ? (
                      <img src={watchedLogo} alt="Logo" className="h-5 w-5 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="h-5 w-5 rounded bg-blue-600 grid place-items-center text-white text-[9px] font-black">
                        {watchedTitle ? watchedTitle.substring(0, 2).toUpperCase() : (watchedName ? watchedName.substring(0,2).toUpperCase() : "BR")}
                      </div>
                    )}
                    <span className="text-xs font-bold text-slate-800">{watchedTitle || watchedName || "Branch Brand"}</span>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600">Preview</span>
                </div>

                {/* Mock Hero Content */}
                <div className="px-4 py-5 flex-1">
                  <div className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600 border border-blue-100">
                    <Sparkles className="h-2.5 w-2.5 text-blue-500" />
                    Active Portal
                  </div>
                  <h3 className="mt-3 text-base font-black text-slate-900 leading-snug">{watchedHeading || `Welcome to ${watchedName || "Our Branch"}`}</h3>
                  {watchedSlogan && <p className="mt-1 text-xs text-blue-600 font-semibold italic">"{watchedSlogan}"</p>}
                  <p className="mt-3 text-xs text-slate-500 leading-relaxed">{watchedHeroContent || "No description set yet."}</p>
                  
                  <div className="mt-5">
                    <div className="w-full rounded-lg bg-blue-600 py-2 text-center text-xs font-bold text-white">Enter Operations Dashboard</div>
                  </div>

                  <hr className="my-5 border-slate-200" />

                  {/* Mock Contact Details */}
                  <div className="space-y-2.5">
                    <div className="flex gap-2 items-start text-xs">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-700">Location</p>
                        <p className="text-slate-500 text-[10px] leading-normal">{watchedAddress || "No address set"}</p>
                      </div>
                    </div>
                    {watchedPhone && (
                      <div className="flex gap-2 items-center text-xs">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="font-semibold text-slate-700">Phone: <span className="font-normal text-slate-500">{watchedPhone}</span></span>
                      </div>
                    )}
                    {watchedEmail && (
                      <div className="flex gap-2 items-center text-xs">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="font-semibold text-slate-700">Email: <span className="font-normal text-slate-500 truncate max-w-[150px] inline-block align-bottom">{watchedEmail}</span></span>
                      </div>
                    )}
                  </div>

                  {/* Mock Social Links */}
                  {(watchedFacebook || watchedInstagram || watchedTwitter || watchedLinkedin) && (
                    <div className="mt-5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Social Profiles</p>
                      <div className="flex gap-1.5">
                        {watchedFacebook && <div className="h-6 w-6 rounded bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center"><Facebook className="h-3 w-3" /></div>}
                        {watchedInstagram && <div className="h-6 w-6 rounded bg-pink-50 text-pink-600 border border-pink-100 flex items-center justify-center"><Instagram className="h-3 w-3" /></div>}
                        {watchedTwitter && <div className="h-6 w-6 rounded bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center"><Twitter className="h-3 w-3" /></div>}
                        {watchedLinkedin && <div className="h-6 w-6 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center"><Linkedin className="h-3 w-3" /></div>}
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </div>
          </div>

        </div>
      ) : (
        /* Display Mode (Beautiful View) */
        <>
          {/* Small Context Banner */}
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
            <div className="flex items-center gap-1.5 font-semibold">
              <Info className="h-4 w-4 shrink-0 text-blue-500" />
              <span>Active Branch Context: <strong>{name}</strong></span>
            </div>
            {hasRole("OWNER") && (
              <button onClick={() => setIsEditing(true)} className="underline font-bold text-blue-600 hover:text-blue-800 bg-transparent border-none p-0 cursor-pointer">
                Configure brand settings for {name}
              </button>
            )}
          </div>

          {/* Hero Portal Card */}
          <Card className="relative overflow-hidden border-none shadow-lg">
            <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(135deg,#1769aa,#0f9f8f)]" />
            <CardContent className="relative z-10 px-6 pt-20 pb-8 sm:px-8 sm:pb-12">
              <div className="flex justify-between items-start gap-4">
                <div className="rounded-2xl bg-white p-2.5 shadow-md border border-slate-100">
                  {logo ? (
                    <img src={logo} alt="Branch Logo" className="h-16 w-16 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] grid place-items-center text-white text-xl font-black shadow-inner">
                      {title.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-slate-800 backdrop-blur-xs shadow-xs border border-white/50">
                  <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                  Live Portal
                </span>
              </div>

              <div className="mt-6">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</p>
                <h1 className="mt-2 text-2xl font-black text-slate-900 leading-tight sm:text-3xl">
                  {heading}
                </h1>
                {slogan && <p className="mt-2 text-sm font-semibold text-blue-600 italic">"{slogan}"</p>}
              </div>

              <p className="mt-4 text-sm text-slate-600 leading-relaxed max-w-2xl">
                {heroContent}
              </p>

              <div className="mt-8">
                <Link to="/dashboard">
                  <Button className="h-12 justify-between gap-4 px-6 text-sm font-bold shadow-md shadow-blue-200">
                    Enter Operations Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Contact Details Grid */}
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="mt-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Location</p>
                  <p className="mt-1 text-xs font-bold text-slate-800 leading-normal line-clamp-3">
                    {address || "Location not configured"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="mt-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Contact Number</p>
                  <p className="mt-1 text-xs font-bold text-slate-800">
                    {phone || "Phone not configured"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="mt-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email Address</p>
                  <p className="mt-1 text-xs font-bold text-slate-800 truncate" title={email || "Email not configured"}>
                    {email || "Email not configured"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Social Links Card */}
          {(socialLinks.facebook || socialLinks.instagram || socialLinks.twitter || socialLinks.linkedin) ? (
            <Card className="mt-6 border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3.5">Follow Our Branch</h3>
                <div className="flex flex-wrap gap-3">
                  {socialLinks.facebook && (
                    <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300">
                      <Facebook className="h-4 w-4 text-blue-600" />
                      Facebook
                    </a>
                  )}
                  {socialLinks.instagram && (
                    <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300">
                      <Instagram className="h-4 w-4 text-pink-600" />
                      Instagram
                    </a>
                  )}
                  {socialLinks.twitter && (
                    <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300">
                      <Twitter className="h-4 w-4 text-sky-500" />
                      Twitter
                    </a>
                  )}
                  {socialLinks.linkedin && (
                    <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300">
                      <Linkedin className="h-4 w-4 text-indigo-600" />
                      LinkedIn
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

    </div>
  );
}
