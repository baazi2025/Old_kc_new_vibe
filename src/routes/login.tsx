import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { Mail, Phone, Sparkles, UserRound, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Vibe Malayali" }] }),
  component: Login,
});

const EMOJIS = ["🧑", "👩", "🧔", "👨‍🎤", "👩‍🎨", "🧑‍🚀", "🦸", "🧙", "🥷", "🐯", "🦊", "🐼"];

type Mode = "signin" | "signup" | "phone";

function Login() {
  const nav = useNavigate();
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
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");

  function requireProfileDetails() {
    if (!gender) return toast.error("Please choose gender"), false;
    if (!dob) return toast.error("Please enter date of birth"), false;
    return true;
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (username.length < 3) return toast.error("Username must be 3+ chars");
    if (password.length < 6) return toast.error("Password must be 6+ chars");
    if (!requireProfileDetails()) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/chat`,
        data: { username, avatar_emoji: emoji, gender, dob },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email to confirm 📧");
  }

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back 👋");
    nav({ to: "/chat" });
  }

  async function sendPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!requireProfileDetails()) return;
    if (!phone.startsWith("+")) return toast.error("Use +91… format");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { data: { username: username || `user_${phone.slice(-4)}`, avatar_emoji: emoji, gender, dob } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setOtpSent(true);
    toast.success("OTP sent 📲");
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
    if (!requireProfileDetails()) return;
    setLoading(true);
    const guestName = `Guest_${Math.random().toString(36).slice(2, 7)}`;
    const { error } = await supabase.auth.signInAnonymously({
      options: { data: { username: guestName, avatar_emoji: emoji, gender, dob } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(`Vibing as ${guestName}`);
    nav({ to: "/chat" });
  }

  return (
    <div className="relative min-h-screen grid-bg flex flex-col">
      <AmbientOrbs />
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
              <EmojiPicker value={emoji} onChange={setEmoji} />
              <Field icon={<UserRound size={16}/>} placeholder="username (e.g. anju_rj)" value={username} onChange={setUsername} />
              <ProfileFields gender={gender} setGender={setGender} dob={dob} setDob={setDob} />
              <Field icon={<Mail size={16}/>} placeholder="you@vibe.com" value={email} onChange={setEmail} type="email" />
              <Field icon={<Lock size={16}/>} placeholder="Password (6+ chars)" value={password} onChange={setPassword} type="password" />
              <button disabled={loading} className="btn-neon w-full text-sm flex items-center justify-center gap-2">
                {loading && <Loader2 size={14} className="animate-spin"/>} Create account
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

          <div className="my-5 flex items-center gap-3 text-[10px] text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mb-3">
            <ProfileFields gender={gender} setGender={setGender} dob={dob} setDob={setDob} />
          </div>
          <button onClick={guestLogin} disabled={loading} className="w-full rounded-2xl glass py-3 text-xs font-semibold flex items-center justify-center gap-2">
            <UserRound size={14} /> Continue as Guest
          </button>
        </div>

        <p className="font-mal mt-6 text-center text-[11px] text-muted-foreground">
          തുടരുന്നതിലൂടെ നിങ്ങൾ വ്യവസ്ഥകൾ അംഗീകരിക്കുന്നു
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

function ProfileFields({
  gender,
  setGender,
  dob,
  setDob,
}: {
  gender: string;
  setGender: (v: string) => void;
  dob: string;
  setDob: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        className="min-h-11 rounded-2xl bg-input px-3 text-xs outline-none"
      >
        <option value="">Gender</option>
        <option value="female">Female</option>
        <option value="male">Male</option>
        <option value="non_binary">Non-binary</option>
        <option value="prefer_not">Prefer not to say</option>
      </select>
      <input
        type="date"
        value={dob}
        onChange={(e) => setDob(e.target.value)}
        className="min-h-11 rounded-2xl bg-input px-3 text-xs outline-none"
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
