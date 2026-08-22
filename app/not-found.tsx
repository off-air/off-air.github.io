import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <p>404 — NOT FOUND</p>
      <h1>이곳에는 아직 기록이 없습니다.</h1>
      <span>주소가 바뀌었거나 존재하지 않는 기록입니다.</span>
      <Link href="/">기록 목록으로 돌아가기 →</Link>
    </main>
  );
}
