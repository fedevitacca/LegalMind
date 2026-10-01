export default function PanelVencimientos({
  items,
  title,
}: {
  items: string[];
  title: string;
}) {
  return (
    <article className="surface-card surface-card-interactive min-h-[210px] rounded-xl border border-[#84A2BD]/35 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <span className="rounded-full bg-[#A68147] px-3 py-1 text-sm font-semibold text-white">
          {items.length}
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            className="border-l-2 border-[#84A2BD] pl-3 text-base font-medium leading-snug"
            key={item}
          >
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}
