import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NuvioEmptyState } from "@/components/nuvio-empty-state";
import { listPublicMagazinePosts } from "@/lib/magazine-db";
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

  return (
    <div className="font-pretendard bg-white">
      <section className="flex min-h-screen w-full flex-col items-center px-[2.083vw] pb-[6.25vw] pt-[4.514vw] max-md:pt-10">
        <h1 className="text-[32px] font-medium leading-none text-[#5B3A29]">
          누비오 소식지
        </h1>

        {posts.length === 0 ? (
          <NuvioEmptyState
            className="mt-[clamp(40px,2.778vw,53.333px)] w-[min(100%,clamp(1085px,75.3472vw,1446.667px))] rounded-[clamp(10px,0.6944vw,13.333px)] bg-[#f8f8f8] max-md:w-[88vw]"
            label="소식지"
          />
        ) : (
          <div className="mt-[clamp(40px,2.778vw,53.333px)] grid w-[min(100%,clamp(1085px,75.3472vw,1446.667px))] grid-cols-2 gap-x-[clamp(25px,1.7361vw,33.333px)] gap-y-[clamp(16px,1.1111vw,21.333px)] max-md:w-[88vw] max-md:grid-cols-1 max-md:gap-y-6">
            {posts.map((post) => (
              <article
                className="h-[clamp(550px,38.1944vw,733.333px)] min-w-0 text-center"
                key={post.id}
              >
                <Link
                  className="group flex h-full w-full flex-col overflow-hidden rounded-[clamp(10px,0.6944vw,13.333px)] bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FE701E]"
                  href={`/magazine/${post.slug}`}
                >
                  <MagazineImage
                    alt={post.coverImageAlt || post.title}
                    src={post.coverImageUrl}
                  />
                  <p className="mt-[clamp(32px,2.2222vw,42.667px)] line-clamp-1 px-[clamp(32px,2.2222vw,42.667px)] text-[clamp(14px,0.9722vw,18.667px)] font-normal leading-[1.253] text-black max-md:text-[13px]">
                    {post.subtitle ||
                      post.excerpt ||
                      "누비어에게 전하는 프로그램과 지역 소식을 모았어요."}
                  </p>
                  <h2 className="mt-[clamp(20px,1.3889vw,26.667px)] line-clamp-2 px-[clamp(32px,2.2222vw,42.667px)] text-[clamp(14px,0.9722vw,18.667px)] font-normal leading-[1.253] text-black max-md:text-[14px]">
                    {post.title}
                  </h2>
                  <p className="mt-auto pb-[clamp(28px,1.9444vw,37.333px)] text-[clamp(14px,0.9722vw,18.667px)] font-normal leading-[1.253] text-black max-md:text-[14px]">
                    {post.authorName || "NUVIO"}
                  </p>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MagazineImage({ alt, src }: { alt: string; src: string }) {
  if (!src) {
    return (
      <div className="grid h-[clamp(368px,25.5556vw,490.667px)] w-full shrink-0 place-items-center overflow-hidden bg-[#D9D9D9]">
        <span className="text-[13px] font-bold text-white/70">NUVIO</span>
      </div>
    );
  }

  return (
    <div className="relative h-[clamp(368px,25.5556vw,490.667px)] w-full shrink-0 overflow-hidden bg-[#D9D9D9]">
      <Image
        alt={alt}
        className="object-cover transition duration-500 ease-out group-hover:scale-[1.035]"
        fill
        sizes="(min-width: 1920px) 707px, (min-width: 768px) 37vw, 88vw"
        src={src}
      />
    </div>
  );
}
