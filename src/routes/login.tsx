import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { CommunityPolicyModal } from "@/components/CommunityPolicyModal";
import { ProfileFields, validateAdultDob } from "@/components/ProfileFields";
import { Mail, Phone, Sparkles, UserRound, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { seo } from "@/lib/seo";
import { cleanUsername, ensureUsernameAvailable } from "@/lib/username";
import { ensureProfileForUser } from "@/lib/authProfile";
import { errorMessage } from "@/lib/errorMessage";
import { useAuth } from "@/hooks/useAuth";
import { accountTypeForProfile } from "@/lib/account";

export const Route = createFileRoute("/login")({
  head: () =>
    seo({
      title: "Join Vibemalayali Chat | Register or Enter as Guest",
      description:
        "Register or enter as a guest to join Vibemalayali Chat rooms, meet Malayali friends, and enjoy voice notes, moods, radio, and mini games.",
      path: "/login",
    }),
  component: Login,
});

const EMOJIS = ["🧑", "👩", "🧔", "👨‍🎤", "👩‍🎨", "🧑‍🚀", "🦸", "🧙", "🥷", "🐯", "🦊", "🐼"];

type Mode = "signin" | "signup" | "phone";

function Login() {
  const nav = useNavigate();
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);

  // form state
  const [username, setUsername] = useState("");
  const [emoji, setEmoji] = useState("🧑");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [policyAction, setPolicyAction] = useState<"signup" | "phone" | "guest" | null>(null);
  const upgradingGuest = Boolean(user && accountTypeForProfile(profile) === "guest");

  useEffect(() => {
    if (!upgradingGuest) return;
    setMode("signup");
    if (profile?.username) setUsername(profile.username);
    if (profile?.avatar_emoji) setEmoji(profile.avatar_emoji);
  }, [upgradingGuest, profile?.username, profile?.avatar_emoji]);

  function requireProfileDetails() {
    if (!gender) return toast.error("Please choose gender"), false;
    if (!dob) return toast.error("Please enter date of birth"), false;
    const dobError = validateAdultDob(dob);
    if (dobError) return toast.error(dobError), false;
    return true;
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (upgradingGuest) {
      if (password.length < 6) return toast.error("Password must be 6+ chars");
      setPolicyAction("signup");
      return;
    }
    const clean = cleanUsername(username);
    if (clean.length < 3) return toast.error("Username must be 3+ chars");
    if (password.length < 6) return toast.error("Password must be 6+ chars");
    if (!requireProfileDetails()) return;
    try {
      const availability = await ensureUsernameAvailable(clean);
      if (!availability.ok) return toast.error(availability.message);
      setUsername(availability.username);
    } catch (error) {
      return toast.error(errorMessage(error, "Could not check username"));
    }
    setPolicyAction("signup");
  }

  async function executeSignup() {
    setLoading(true);
    try {
      if (upgradingGuest) {
        if (!email || password.length < 6) {
          toast.error("Email and 6+ character password are required to save your guest profile.");
          return;
        }
        const { error: updateError } = await supabase.auth.updateUser({
          email,
          password,
          data: { username: username || profile?.username, avatar_emoji: emoji, gender, dob },
        });
        if (updateError) {
          toast.error(updateError.message);
          return;
        }
        const { error: upgradeError } = await (supabase as any).rpc("upgrade_current_guest");
        if (upgradeError) {
          toast.error(upgradeError.message);
          return;
        }
        toast.success("Profile saved. Check your email if confirmation is required.");
        nav({ to: "/chat" });
        return;
      }

      const availability = await ensureUsernameAvailable(username);
      if (!availability.ok) {
        toast.error(availability.message);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/chat`,
          data: { username: availability.username, avatar_emoji: emoji, gender, dob },
        },
      });
      console.info("[signup:response]", {
        userId: data.user?.id ?? null,
        hasSession: Boolean(data.session),
        error: error?.message ?? null,
      });
      if (error) {
        toast.error(`Signup failed: ${error.message}`);
        return;
      }
      if (data.user && data.session) {
        const profileResult = await ensureProfileForUser(data.user, {
          username: availability.username,
          avatar_emoji: emoji,
          gender,
          dob,
          is_guest: false,
        });
        console.info("[signup:profile]", {
          userId: data.user.id,
          created: profileResult.created,
          error: profileResult.error?.message ?? null,
        });
        if (profileResult.error) {
          toast.error(`Account created, but profile save failed: ${profileResult.error.message}`);
          return;
        }
      }
      toast.success(data.session ? "Account created. Entering chat..." : "Check your email to confirm 📧");
      if (data.session) nav({ to: "/chat" });
    } catch (error) {
      console.error("[signup:error]", error);
      toast.error(errorMessage(error, "Signup failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data.user) {
        const profileResult = await ensureProfileForUser(data.user);
        console.info("[signin:profile-fallback]", {
          userId: data.user.id,
          created: profileResult.created,
          error: profileResult.error?.message ?? null,
        });
      }
      toast.success("Welcome back 👋");
      nav({ to: "/chat" });
    } catch (error) {
      console.error("[signin:error]", error);
      toast.error(errorMessage(error, "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  async function sendPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!requireProfileDetails()) return;
    if (!phone.startsWith("+")) return toast.error("Use +91 format");
    setPolicyAction("phone");
  }

  async function executePhoneOtp() {
    setLoading(true);
    const phoneUsername = username || `user_${phone.slice(-4)}`;
    const availability = await ensureUsernameAvailable(phoneUsername);
    if (!availability.ok) {
      setLoading(false);
      toast.error(availability.message);
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { data: { username: availability.username, avatar_emoji: emoji, gender, dob } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setOtpSent(true);
    toast.success("OTP sent");
  }

  async function verifyPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Verified ✨");
    nav({ to: "/chat" });
  }

  async function guestLogin() {
    const cleanGuestName = cleanUsername(guestName);
    if (cleanGuestName.length < 2) return toast.error("Please enter your name");
    if (!requireProfileDetails()) return;
    try {
      const availability = await ensureUsernameAvailable(cleanGuestName);
      if (!availability.ok) return toast.error(availability.message);
      setGuestName(availability.username);
    } catch (error) {
      return toast.error(errorMessage(error, "Could not check username"));
    }
    setPolicyAction("guest");
    return;
  }

  async function executeGuestLogin() {
    setLoading(true);
    try {
      const availability = await ensureUsernameAvailable(guestName);
      if (!availability.ok) {
        toast.error(availability.message);
        return;
      }
      const finalGuestName = availability.username;
      const { data, error } = await supabase.auth.signInAnonymously({
        options: { data: { username: finalGuestName, avatar_emoji: emoji, gender, dob } },
      });
      if (error) {
        toast.error(`Guest signup failed: ${error.message}`);
        return;
      }
      if (data.user) {
        const profileResult = await ensureProfileForUser(data.user, {
          username: finalGuestName,
          avatar_emoji: emoji,
          gender,
          dob,
          is_guest: true,
        });
        console.info("[guest:profile]", {
          userId: data.user.id,
          created: profileResult.created,
          error: profileResult.error?.message ?? null,
        });
        if (profileResult.error) {
          toast.error(`Guest created, but profile save failed: ${profileResult.error.message}`);
          return;
        }
      }
      toast.success(`Vibing as ${finalGuestName}`);
      nav({ to: "/chat" });
    } catch (error) {
      console.error("[guest:error]", error);
      toast.error(errorMessage(error, "Guest login failed"));
    } finally {
      setLoading(false);
    }
  }

  function acceptPolicy() {
    const action = policyAction;
    setPolicyAction(null);
    if (action === "signup") void executeSignup();
    if (action === "phone") void executePhoneOtp();
    if (action === "guest") void executeGuestLogin();
  }

  return (
    <div className="relative min-h-screen grid-bg flex flex-col">
      <AmbientOrbs />
      <CommunityPolicyModal
        open={policyAction !== null}
        onClose={() => setPolicyAction(null)}
        onAccept={acceptPolicy}
      />
      <div className="mx-auto w-full max-w-md flex-1 px-5 pt-10 pb-8">
        <Link to="/" className="text-xs text-muted-foreground">← Back</Link>

        <div className="mt-6 flex items-center gap-2">
          <div className="h-11 w-11 rounded-2xl bg-hero shadow-glow flex items-center justify-center">
            <Sparkles className="text-white" size={20} />
          </div>
          <div>
            <p className="text-lg font-bold">Vibe<span className="text-gradient">Malayali</span></p>
            <p className="font-mal text-xs text-muted-foreground">സ്വാഗതം ❤️</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 grid grid-cols-3 gap-1 glass rounded-full p-1 text-xs font-semibold">
          {(["signin", "signup", "phone"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setOtpSent(false); }}
              className={`rounded-full py-2 transition ${mode === m ? "bg-hero text-white shadow-glow" : "text-muted-foreground"}`}
            >
              {m === "signin" ? "Sign In" : m === "signup" ? "Sign Up" : "Phone OTP"}
            </button>
          ))}
        </div>

        <div className="mt-5 glass-strong rounded-3xl p-5 shadow-glow">
          {mode === "signin" && (
            <form onSubmit={handleSignin} className="space-y-3">
              <Field icon={<Mail size={16}/>} placeholder="you@vibe.com" value={email} onChange={setEmail} type="email" />
              <Field icon={<Lock size={16}/>} placeholder="Password" value={password} onChange={setPassword} type="password" />
              <button disabled={loading} className="btn-neon w-full text-sm flex items-center justify-center gap-2">
                {loading && <Loader2 size={14} className="animate-spin"/>} Sign In
              </button>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignup} className="space-y-3">
              {upgradingGuest && (
                <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-3 py-3 text-xs font-bold leading-5 text-amber-100">
                  Register now to keep your guest username, coins, gifts, mood, profile picture, and streak.
                </div>
              )}
              <EmojiPicker value={emoji} onChange={setEmoji} />
              <Field icon={<UserRound size={16}/>} placeholder="username (e.g. anju_rj)" value={username} onChange={setUsername} />
              {!upgradingGuest && <ProfileFields gender={gender} setGender={setGender} dob={dob} setDob={setDob} />}
              <Field icon={<Mail size={16}/>} placeholder="you@vibe.com" value={email} onChange={setEmail} type="email" />
              <Field icon={<Lock size={16}/>} placeholder="Password (6+ chars)" value={password} onChange={setPassword} type="password" />
              <button disabled={loading} className="btn-neon w-full text-sm flex items-center justify-center gap-2">
                {loading && <Loader2 size={14} className="animate-spin"/>} {upgradingGuest ? "Register & Save My Profile" : "Create account"}
              </button>
              <p className="font-mal text-[10px] text-muted-foreground text-center">Email-ൽ confirm link വരും ✉️</p>
            </form>
          )}

          {mode === "phone" && !otpSent && (
            <form onSubmit={sendPhoneOtp} className="space-y-3">
              <EmojiPicker value={emoji} onChange={setEmoji} />
              <Field icon={<UserRound size={16}/>} placeholder="username" value={username} onChange={setUsername} />
              <ProfileFields gender={gender} setGender={setGender} dob={dob} setDob={setDob} />
              <Field icon={<Phone size={16}/>} placeholder="+91 98xxxxxxxx" value={phone} onChange={setPhone} type="tel" />
              <button disabled={loading} className="btn-neon w-full text-sm flex items-center justify-center gap-2">
                {loading && <Loader2 size={14} className="animate-spin"/>} Send OTP
              </button>
            </form>
          )}

          {mode === "phone" && otpSent && (
            <form onSubmit={verifyPhoneOtp} className="space-y-3">
              <p className="text-xs text-muted-foreground">OTP sent to {phone}</p>
              <Field icon={<Lock size={16}/>} placeholder="6-digit OTP" value={otp} onChange={setOtp} />
              <button disabled={loading} className="btn-neon w-full text-sm flex items-center justify-center gap-2">
                {loading && <Loader2 size={14} className="animate-spin"/>} Verify & Enter
              </button>
            </form>
          )}

          {!upgradingGuest && (
            <>
              <div className="my-5 flex items-center gap-3 text-[10px] text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
              </div>

              <div className="mb-3">
                <Field icon={<UserRound size={16}/>} placeholder="your name" value={guestName} onChange={setGuestName} />
              </div>
              <div className="mb-3">
                <ProfileFields gender={gender} setGender={setGender} dob={dob} setDob={setDob} />
              </div>
              <button onClick={guestLogin} disabled={loading} className="w-full rounded-2xl glass py-3 text-xs font-semibold flex items-center justify-center gap-2">
                <UserRound size={14} /> Continue as Guest
              </button>
            </>
          )}
        </div>

        <p className="font-mal mt-6 text-center text-[11px] text-muted-foreground">
          à´¤àµà´Ÿà´°àµà´¨àµà´¨à´¤à´¿à´²àµ‚à´Ÿàµ† à´¨à´¿à´™àµà´™àµ¾ à´µàµà´¯à´µà´¸àµà´¥à´•àµ¾ à´…à´‚à´—àµ€à´•à´°à´¿à´•àµà´•àµà´¨àµà´¨àµ
        </p>
      </div>
    </div>
  );
}

function Field({ icon, placeholder, value, onChange, type = "text" }: { icon: React.ReactNode; placeholder: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-input px-3 py-3">
      <span className="text-muted-foreground">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-muted-foreground">AVATAR</label>
      <div className="mt-1.5 flex gap-1.5 overflow-x-auto no-scrollbar">
        {EMOJIS.map((e) => (
          <button
            type="button"
            key={e}
            onClick={() => onChange(e)}
            className={`shrink-0 h-9 w-9 rounded-xl text-lg transition ${value === e ? "bg-hero shadow-glow scale-110" : "glass"}`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}


