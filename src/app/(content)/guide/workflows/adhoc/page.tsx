import WorkflowPage from "@/components/guide/WorkflowPage";
import { WORKFLOW_MAP } from "@/lib/guide-data/workflows";

export const metadata = { title: "Ad-Hoc Visit — ParQwish Guide" };

export default function Page() {
  return <WorkflowPage workflow={WORKFLOW_MAP["adhoc"]} />;
}
