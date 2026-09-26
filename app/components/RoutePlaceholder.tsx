import Link from "next/link";

export function RoutePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <main className="min-h-[65vh] bg-[#f7faff] py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-[#e4ebf3] bg-white p-8 text-center shadow-[0_18px_50px_rgba(16,36,62,.07)] sm:p-12">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#edf5ff] text-[#075b3d] text-sm font-black">PHASE 1</div>
          <h1 className="mt-6 text-[30px] font-black tracking-[-0.03em] text-[#172d25]">{title}</h1>
          <p className="mt-3 text-[15px] leading-7 text-[#69798e]">{description}</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/" className="rounded-xl bg-[#ffd447] px-5 py-3 text-[14px] font-extrabold text-[#172d25]">Back to Home</Link>
            <Link href="/plan-trip" className="rounded-xl border border-[#dfe7f0] px-5 py-3 text-[14px] font-extrabold text-[#24425f]">Open Trip Planner</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
