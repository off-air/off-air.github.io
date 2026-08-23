import { listPublicRecords } from "../../../lib/records";
import { withPublicCors } from "../../../lib/public-cors";

export async function GET(request: Request){
  return withPublicCors(request, Response.json(await listPublicRecords(), {
    headers: { "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60" },
  }));
}
