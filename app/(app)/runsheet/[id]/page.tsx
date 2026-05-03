import { RunsheetView } from "./runsheet-view";

export default async function RunsheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string; tab?: string; sv?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  return (
    <RunsheetView
      id={id}
      searchParams={{
        day: sp.day,
        tab: sp.tab,
        sv: sp.sv,
      }}
    />
  );
}
