import DiasporaShell from "./_components/DiasporaShell.tsx";
import ProgrammePage from "./_components/ProgrammePage.tsx";

export default function DiasporaOwnPage() {
  return (
    <DiasporaShell>
      <ProgrammePage programmeKey="own" />
    </DiasporaShell>
  );
}
