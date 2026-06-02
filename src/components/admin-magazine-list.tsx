"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Archive, Edit3, Eye, Loader2, Plus } from "lucide-react";
import type { MagazinePost } from "@/lib/magazine-db";
import { getMagazineCategoryLabel } from "@/lib/magazine-types";

type MagazinePostsResponse = {
  data?: MagazinePost[];
  error?: string;
};

const statusLabels: Record<MagazinePost["status"], string> = {
  archived: "보관",
  draft: "초안",
  published: "공개",
};

const statusClasses: Record<MagazinePost["status"], string> = {
  archived: "bg-slate-100 text-slate-500 ring-slate-200",
  draft: "bg-amber-50 text-amber-700 ring-amber-200",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export function AdminMagazineList() {
  const [posts, setPosts] = useState<MagazinePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [archivingId, setArchivingId] = useState("");

  async function loadPosts() {
    try {
      const response = await fetch("/api/admin/magazine-posts", {
        cache: "no-store",
      });
      const payload = (await response.json()) as MagazinePostsResponse;
      if (!response.ok) throw new Error(payload.error || "글을 불러오지 못했어요.");
      setError("");
      setPosts(payload.data ?? []);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "글을 불러오지 못했어요.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    fetch("/api/admin/magazine-posts", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as MagazinePostsResponse;
        if (!response.ok) {
          throw new Error(payload.error || "글을 불러오지 못했어요.");
        }
        return payload.data ?? [];
      })
      .then((nextPosts) => {
        if (!active) return;
        setError("");
        setPosts(nextPosts);
      })
      .catch((nextError: unknown) => {
        if (!active) return;
        setError(
          nextError instanceof Error
            ? nextError.message
            : "글을 불러오지 못했어요.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function archivePost(post: MagazinePost) {
    if (!window.confirm(`"${post.title}" 글을 보관할까요? 공개 목록에서 사라집니다.`)) {
      return;
    }

    setArchivingId(post.id);
    try {
      const response = await fetch(`/api/admin/magazine-posts/${post.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as MagazinePostsResponse;
      if (!response.ok) throw new Error(payload.error || "보관 처리에 실패했어요.");
      await loadPosts();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "보관 처리에 실패했어요.",
      );
    } finally {
      setArchivingId("");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-black text-[var(--primary)]">MAGAZINE</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">
              소식지 관리
            </h1>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
              이미지 중심 매거진 글을 작성하고 공개 상태를 관리합니다.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white hover:bg-[var(--primary-strong)]"
            href="/admin/magazine/new"
          >
            <Plus size={17} strokeWidth={2.2} />
            새 글 작성
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">전체 글</h2>
          {loading ? <Loader2 className="animate-spin text-slate-400" size={18} /> : null}
        </div>

        {error ? (
          <p className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700">
            {error}
          </p>
        ) : null}

        {posts.length === 0 && !loading ? (
          <div className="p-10 text-center text-sm font-bold text-slate-500">
            아직 작성된 소식지 글이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">글</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">카테고리</th>
                  <th className="px-5 py-3">업데이트</th>
                  <th className="px-5 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {posts.map((post) => (
                  <tr className="align-top" key={post.id}>
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-950">{post.title}</p>
                      <p className="mt-1 max-w-xl line-clamp-1 text-xs font-bold text-slate-500">
                        /magazine/{post.slug}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-xs font-black ring-1 ${statusClasses[post.status]}`}
                      >
                        {statusLabels[post.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-600">
                      {getMagazineCategoryLabel(post.category)}
                    </td>
                    <td className="px-5 py-4 text-xs font-bold text-slate-500">
                      {new Date(post.updatedAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {post.status === "published" ? (
                          <Link
                            className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                            href={`/magazine/${post.slug}`}
                            target="_blank"
                            title="공개 글 보기"
                          >
                            <Eye size={16} />
                          </Link>
                        ) : null}
                        <Link
                          className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                          href={`/admin/magazine/${post.id}/edit`}
                          title="수정"
                        >
                          <Edit3 size={16} />
                        </Link>
                        {post.status !== "archived" ? (
                          <button
                            className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
                            disabled={archivingId === post.id}
                            onClick={() => void archivePost(post)}
                            title="보관"
                            type="button"
                          >
                            {archivingId === post.id ? (
                              <Loader2 className="animate-spin" size={16} />
                            ) : (
                              <Archive size={16} />
                            )}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
