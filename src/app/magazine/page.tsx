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
        <h1 className="text-[1.042vw] font-medium leading-none text-[#5B3A29] max-md:text-sm">
          누비오 소식지
        </h1>

        {posts.length === 0 ? (
          <NuvioEmptyState
            className="mt-[2.778vw] w-[52.778vw] rounded-[0.694vw] bg-[#f8f8f8] max-md:w-[88vw]"
            label="소식지"
          />
        ) : (
          <div className="mt-[2.778vw] grid w-[52.778vw] grid-cols-2 gap-x-[1.389vw] gap-y-[3.472vw] max-md:w-[88vw] max-md:gap-x-3 max-md:gap-y-8">
            {posts.map((post) => (
              <article
                className="flex min-w-0 flex-col items-center text-center"
                key={post.id}
              >
                <Link className="group block w-full" href={`/magazine/${post.slug}`}>
                  <MagazineImage
                    alt={post.coverImageAlt || post.title}
                    src={post.coverImageUrl}
                  />
                  <h2 className="mt-[1.25vw] line-clamp-2 text-[0.833vw] font-semibold leading-tight text-[#2B1E17] transition group-hover:text-[#fe701e] max-md:text-[12px]">
                    {post.title}
                  </h2>
                  <p className="mt-[0.764vw] line-clamp-2 text-[0.729vw] font-medium leading-normal text-[#2B1E17] max-md:text-[11px]">
                    {post.subtitle ||
                      post.excerpt ||
                      "누비어에게 전하는 프로그램과 지역 소식을 모았어요."}
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
      <div className="grid aspect-[368/259] w-full place-items-center overflow-hidden rounded-[0.694vw] bg-[#D9D9D9]">
        <span className="text-[13px] font-bold text-white/70">NUVIO</span>
      </div>
    );
  }

  return (
    <div className="relative aspect-[368/259] w-full overflow-hidden rounded-[0.694vw] bg-[#D9D9D9]">
      <Image
        alt={alt}
        className="object-cover transition duration-500 group-hover:scale-[1.03]"
        fill
        sizes="(min-width: 768px) 26vw, 44vw"
        src={src}
      />
    </div>
  );
}
