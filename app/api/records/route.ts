import { listPublicRecords } from "../../../lib/records";

export async function GET(){
  return Response.json(await listPublicRecords(), {
    headers: { "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60" },
  });
}
