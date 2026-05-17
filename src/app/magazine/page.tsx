import type { Metadata } from "next";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "누비오 소식지",
  description: "누비오의 로컬 체류 프로그램 소식과 이야기를 확인하세요.",
  path: "/magazine",
  keywords: ["누비오 소식지", "누비오 매거진", "로컬 체류 프로그램"],
});

const magazineItems = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  title: "여행 이름 제목입력하세요",
  description: "해당 내용에 대해 입력하세요.",
  author: "작성자명",
}));

export default function MagazinePage() {
  return (
    <div className="magazine-page">
      <section className="magazine-stage">
        <h1 className="magazine-title">누비오 소식지</h1>

        <div className="magazine-grid">
          {magazineItems.map((item) => (
            <article className="magazine-card" key={item.id}>
              <div className="magazine-card-image" />
              <h2 className="magazine-card-title">{item.title}</h2>
              <p className="magazine-card-description">{item.description}</p>
              <p className="magazine-card-author">{item.author}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
