import DirectoryPage from "@/components/DirectoryPage";
import { loadEntities } from "@/lib/entities/loadEntities";

export default function Page() {
  const entities = loadEntities();
  const todayKey = new Date().toISOString().slice(0, 10);

  return <DirectoryPage initialEntities={entities} todayKey={todayKey} />;
}
