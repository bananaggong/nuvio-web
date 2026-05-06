import {
  boseongIntroBlocks,
  boseongIntroPrograms,
} from "@/lib/boseong-intro-content";

export function BoseongIntroSection() {
  return (
    <section className="border-b border-[#d9d6c9] bg-[#f7f7f0] px-5 py-14 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <p className="text-sm font-black text-[#4E7C3A]">마을소개</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight md:text-5xl">
            차와 함께하는 로컬 콘텐츠 실험의 중심지
          </h2>
          <div className="mt-10 divide-y divide-[#d9d6c9] border-y border-[#d9d6c9]">
            {boseongIntroBlocks.map((block) => (
              <section
                className="grid gap-4 py-7 md:grid-cols-[220px_minmax(0,1fr)]"
                key={block.title}
              >
                <h3 className="text-xl font-black text-[#11130f]">{block.title}</h3>
                <div className="space-y-3 text-base leading-8 text-slate-700">
                  {block.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <aside className="border border-[#d9d6c9] bg-white p-6 lg:sticky lg:top-24 lg:self-start">
          <h3 className="text-xl font-black text-[#11130f]">대표 프로그램</h3>
          <div className="mt-5 space-y-5">
            {boseongIntroPrograms.map((program) => (
              <div className="border-t border-[#d9d6c9] pt-5" key={program.title}>
                <p className="font-black text-[#4E7C3A]">{program.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {program.body}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

export function BoseongAboutContent() {
  return (
    <article className="border-y border-[#d9d6c9] bg-white">
      {boseongIntroBlocks.map((block) => (
        <section
          className="grid gap-5 border-b border-[#d9d6c9] px-5 py-8 last:border-b-0 md:grid-cols-[240px_minmax(0,1fr)] md:px-7"
          key={block.title}
        >
          <h2 className="text-2xl font-black text-[#11130f]">{block.title}</h2>
          <div className="space-y-4 text-base leading-8 text-slate-700">
            {block.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
