import Link from "next/link";

export default function NavegacionAreasCaso({
  activeArea,
  caseSlug,
}: {
  activeArea: string;
  caseSlug: string;
}) {
  const isCaseHome = activeArea === "Resumen";
  const backHref = isCaseHome ? "/casos" : `/casos/${caseSlug}`;
  const backLabel = isCaseHome ? "Volver a casos" : "Volver al caso";

  return (
    <div className="flex flex-wrap items-center">
      <Link
        className="rounded-full border border-[#0F2044]/18 bg-[#0F2044] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,32,68,0.14)] transition hover:bg-[#546FC0]"
        href={backHref}
      >
        ← {backLabel}
      </Link>
    </div>
  );
}
