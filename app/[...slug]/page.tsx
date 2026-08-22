import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "cloudflare:workers";
import ArchiveApp from "../archive-client";
import { findPublicRecord, listPublicRecords } from "../../lib/records";

const pages: Record<string, { title: string; description: string }> = {
  submit: {
    title: "기록 제보",
    description: "OFF-AIR 아카이브에 새로운 기록이나 수정 정보를 제보합니다.",
  },
  privacy: {
    title: "데이터 안내",
    description: "OFF-AIR 아카이브의 데이터 이용과 보관 원칙을 안내합니다.",
  },
  admin: {
    title: "관리자 확인",
    description: "인증된 관리자를 위한 기록 관리 화면입니다.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const path = `/${slug.join("/")}`;
  if (slug.length === 2 && slug[0] === "records" && /^\d+$/.test(slug[1])) {
    const record = await findPublicRecord(Number(slug[1]));
    if (!record) notFound();
    const title = `${record.name} — OFF-AIR`;
    const image = record.avatar_key
      ? `/api/profile-images/${encodeURIComponent(record.avatar_key)}`
      : "/og.png";
    return {
      title,
      description: record.note,
      alternates: { canonical: path },
      openGraph: {
        title,
        description: record.note,
        url: path,
        images: [image],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: record.note,
        images: [image],
      },
    };
  }
  if (slug.length !== 1 || !pages[slug[0]]) notFound();
  const page = pages[slug[0]];
  const title = `${page.title} — OFF-AIR`;
  return {
    title,
    description: page.description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: page.description,
      url: path,
      images: [{ url: "/og.png", width: 1536, height: 1024 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: page.description,
      images: ["/og.png"],
    },
  };
}

export default async function RoutedArchivePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const runtime = env as CloudflareEnv & { DEPLOYMENT_ROLE?: string };
  if (slug.length === 1 && slug[0] === "admin" && runtime.DEPLOYMENT_ROLE !== "admin") notFound();
  const recordId = slug.length === 2 && slug[0] === "records" && /^\d+$/.test(slug[1])
    ? Number(slug[1])
    : null;
  const records = await listPublicRecords();
  const isRecord = recordId !== null && records.some((record) => record.id === recordId);
  const isPage = slug.length === 1 && Boolean(pages[slug[0]]);
  if (!isRecord && !isPage) notFound();
  return <ArchiveApp initialPath={`/${slug.join("/")}`} initialPeople={records} />;
}
