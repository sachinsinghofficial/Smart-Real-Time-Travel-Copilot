import Link from "next/link";

type DestinationCardProps = {
  name: string;
  category: string;
  description: string;
  image: string;
};

export function DestinationCard({ name, category, description, image }: DestinationCardProps) {
  return (
    <article className="group overflow-hidden rounded-[22px] border border-[#e9eef4] bg-white shadow-[0_10px_24px_rgba(16,36,62,.06)]">
      <div className="relative h-48 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${image})` }} />
        <div className="absolute inset-x-4 top-4 flex justify-between">
          <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-extrabold text-[#24425f] backdrop-blur">{category}</span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[#172d25] backdrop-blur"><span aria-hidden="true">↗</span></span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-[18px] font-extrabold text-[#172d25]">{name}</h3>
        <p className="mt-2 min-h-12 text-[13px] leading-5 text-[#63746a]">{description}</p>
        <Link href={`/explore?destination=${encodeURIComponent(name)}`} className="mt-4 inline-flex items-center gap-2 text-[13px] font-extrabold text-[#075b3d] hover:gap-3">Explore destination <span aria-hidden="true">↗</span></Link>
      </div>
    </article>
  );
}
