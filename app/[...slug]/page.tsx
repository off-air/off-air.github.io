import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArchiveApp from "../page";

const records: Record<string, { name: string; description: string }> = {
  "1": {
    name: "유노하라 모리",
    description: "숲의 밤을 닮은 목소리로, 늦은 시간의 이야기를 건넸습니다.",
  },
  "2": {
    name: "아마세 루카",
    description: "노래와 그림, 조용한 잡담 방송의 순간들이 남아 있습니다.",
  },
  "3": {
    name: "호시노 네네",
    description: "별을 읽고 게임을 하며, 새벽의 시간을 함께 보냈습니다.",
  },
  "4": {
    name: "사사키 유라",
    description: "작은 노래와 다정한 인사로 수많은 저녁을 이어주었습니다.",
  },
  "5": {
    name: "미즈키 아오",
    description: "느린 게임과 긴 이야기를 좋아했던 푸른 목소리의 기록입니다.",
  },
  "6": {
    name: "코하루 린",
    description: "봄처럼 가벼운 웃음으로 평범한 하루를 환하게 만들었습니다.",
  },
  "7": {
    name: "츠키시로 레이",
    description: "낮은 목소리로 읽어주던 이야기와 달빛 같은 음악이 남았습니다.",
  },
  "8": {
    name: "나나세 토와",
    description: "여행하지 않는 여행 방송, 지도 위의 수많은 밤을 기억합니다.",
  },
};

const pages: Record<string, { title: string; description: string }> = {
  about: {
    title: "소개",
    description: "여전히, 아카이브가 기억을 다루는 원칙을 소개합니다.",
  },
  submit: {
    title: "기록 제보",
    description: "새로운 기록이나 수정이 필요한 정보를 조심스럽게 전해주세요.",
  },
  privacy: {
    title: "데이터 안내",
    description: "여전히, 아카이브가 사용하는 데이터와 보관 원칙을 안내합니다.",
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
  if (slug[0] === "records" && records[slug[1]]) {
    const record = records[slug[1]];
    const title = `${record.name} — 여전히,`;
    return {
      title,
      description: record.description,
      alternates: { canonical: path },
      openGraph: {
        title,
        description: record.description,
        url: path,
        images: [],
      },
      twitter: {
        card: "summary",
        title,
        description: record.description,
        images: [],
      },
    };
  }
  if (slug.length !== 1 || !pages[slug[0]]) notFound();
  const page = pages[slug[0]];
  const title = `${page.title} — 여전히,`;
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
  const isRecord =
    slug.length === 2 && slug[0] === "records" && Boolean(records[slug[1]]);
  const isPage = slug.length === 1 && Boolean(pages[slug[0]]);
  if (!isRecord && !isPage) notFound();
  return <ArchiveApp initialPath={`/${slug.join("/")}`} />;
}
