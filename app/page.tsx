import ArchiveApp from "./archive-client";
import { listPublicRecords } from "../lib/records";

export default async function Page() {
  const records = await listPublicRecords();
  return <ArchiveApp initialPeople={records} />;
}
