import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import { formatDateTime } from "@/lib/format";
import { listPublicMagazinePosts } from "@/lib/magazine-db";
import { getMagazineCategoryLabel } from "@/lib/magazine-types";
import { createSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createSeoMetadata({
  title: "누비오 소식지",
  description: "누비오의 로컬 체류 프로그램 소식과 이야기를 확인하세요.",
  path: "/magazine",
  keywords: ["누비오 소식지", "로컬 라이프", "로컬 체류 프로그램"],
});

export default async function MagazinePage() {
  const posts = await listPublicMagazinePosts(24);
  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  return (
    <div className="font-pretendard min-h-screen bg-white text-[#2B1E17]">
      <section className="mx-auto w-full max-w-[1180px] px-5 pb-20 pt-14 md:px-8 md:pt-20">
        <header className="flex flex-col gap-3 border-b border-[#f0dfd4] pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[13px] font-black text-[#fe701e]">MAGAZINE</p>
            <h1 className="mt-2 text-[34px] font-black leading-tight md:text-[48px]">
              누비오 소식지
            </h1>
          </div>
          <p className="max-w-md text-[15px] font-semibold leading-7 text-[#7A6255]">
            로컬에 머무는 사람과 프로그램, 여행의 장면을 이미지 중심 이야기로
            전합니다.
          </p>
        </header>

        {posts.length === 0 ? (
          <NuvioEmptyState
            className="mt-10 rounded-[8px] bg-[#f8f8f8]"
            label="소식지"
          />
        ) : (
          <>
            {featuredPost ? (
              <Link
                className="group mt-10 grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] md:items-center"
                href={`/magazine/${featuredPost.slug}`}
              >
                <MagazineImage
                  alt={featuredPost.coverImageAlt || featuredPost.title}
                  className="aspect-[16/10]"
                  src={featuredPost.coverImageUrl}
                />
                <article>
                  <p className="text-[13px] font-black text-[#fe701e]">
                    {getMagazineCategoryLabel(featuredPost.category)}
                  </p>
                  <h2 className="mt-4 text-[30px] font-black leading-tight text-[#2B1E17] transition group-hover:text-[#fe701e] md:text-[42px]">
                    {featuredPost.title}
                  </h2>
                  {featuredPost.subtitle || featuredPost.excerpt ? (
                    <p className="mt-4 text-[16px] font-semibold leading-8 text-[#6B5145]">
                      {featuredPost.subtitle || featuredPost.excerpt}
                    </p>
                  ) : null}
                  <time className="mt-6 block text-[13px] font-bold text-[#9A8579]">
                    {formatDateTime(featuredPost.publishedAt ?? featuredPost.createdAt)}
                  </time>
                </article>
              </Link>
            ) : null}

            <div className="mt-14 grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {otherPosts.map((post) => (
                <Link
                  className="group block min-w-0"
                  href={`/magazine/${post.slug}`}
                  key={post.id}
                >
                  <MagazineImage
                    alt={post.coverImageAlt || post.title}
                    className="aspect-[368/259]"
                    src={post.coverImageUrl}
                  />
                  <p className="mt-5 text-[12px] font-black text-[#fe701e]">
                    {getMagazineCategoryLabel(post.category)}
                  </p>
                  <h2 className="mt-2 line-clamp-2 text-[18px] font-black leading-7 text-[#2B1E17] transition group-hover:text-[#fe701e]">
                    {post.title}
                  </h2>
                  {post.excerpt ? (
                    <p className="mt-2 line-clamp-2 text-[14px] font-semibold leading-6 text-[#7A6255]">
                      {post.excerpt}
                    </p>
                  ) : null}
                  <time className="mt-4 block text-[12px] font-bold text-[#9A8579]">
                    {formatDateTime(post.publishedAt ?? post.createdAt)}
                  </time>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function MagazineImage({
  alt,
  className,
  src,
}: {
  alt: string;
  className: string;
  src: string;
}) {
  if (!src) {
    return (
      <div
        className={`${className} grid w-full place-items-center overflow-hidden rounded-[8px] bg-[#D9D9D9]`}
      >
        <span className="text-[13px] font-bold text-white/70">NUVIO</span>
      </div>
    );
  }

  return (
    <div className={`${className} relative w-full overflow-hidden rounded-[8px] bg-[#D9D9D9]`}>
      <Image
        alt={alt}
        className="object-cover transition duration-500 group-hover:scale-[1.03]"
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
        src={src}
      />
    </div>
  );
}
