import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { Construction } from "lucide-react";

// Shared placeholder for Staff Portal sections not yet built (My Tasks, My
// Clients, My Properties, My Sales, Attendance & Leave) — each becomes its
// own milestone. Keeps this page reachable via nav without a broken route.
export default function StaffComingSoon({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Construction />
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>This section is coming soon in a future milestone.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
