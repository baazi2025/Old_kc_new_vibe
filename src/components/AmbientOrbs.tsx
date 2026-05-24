export function AmbientOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-[var(--neon-pink)] opacity-[0.18] blur-3xl animate-orb" />
      <div className="absolute top-1/3 -right-24 h-[360px] w-[360px] rounded-full bg-[var(--neon-cyan)] opacity-[0.14] blur-3xl animate-orb" style={{ animationDelay: "-4s" }} />
      <div className="absolute bottom-0 left-1/4 h-[480px] w-[480px] rounded-full bg-[var(--neon-purple)] opacity-[0.18] blur-3xl animate-orb" style={{ animationDelay: "-8s" }} />
    </div>
  );
}
