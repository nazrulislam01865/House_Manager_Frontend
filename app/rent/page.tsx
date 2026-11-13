import { Shell } from "@/components/shell";
import { Billing } from "@/features/billing";
export default function Page() {
  return (
    <Shell>
      <Billing type="rent" />
    </Shell>
  );
}
