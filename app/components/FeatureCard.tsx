import type { LucideIcon } from "lucide-react";

export function FeatureCard({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="rounded-[22px] border border-[#e9eef4] bg-white p-6 shadow-[0_12px_30px_rgba(16,36,62,.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(16,36,62,.10)]">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf5ff] text-[#075b3d]"><Icon size={23} /></div>
      <h3 className="mt-5 text-[17px] font-extrabold text-[#172d25]">{title}</h3>
      <p className="mt-2 text-[13px] leading-6 text-[#63746a]">{description}</p>
    </div>
  );
}
