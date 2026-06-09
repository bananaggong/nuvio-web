"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useState } from "react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";

type TeamMemberTone = "host" | "manager" | "pending" | "staff";
type PermissionRole = "host" | "manager" | "staff";
type PermissionKey =
  | "applicationReview"
  | "messageReview"
  | "programCreate"
  | "requiredItem"
  | "templateEdit";

const members: Array<{
  email: string;
  name: string;
  role: string;
  tone: TeamMemberTone;
}> = [
  {
    email: "intume0b@gmail.com",
    name: "로컬 호스트",
    role: "호스트",
    tone: "host",
  },
  {
    email: "aaaa@gmail.com",
    name: "이르음",
    role: "운영진",
    tone: "manager",
  },
  {
    email: "aaaa@gmail.com",
    name: "이르음",
    role: "스태프",
    tone: "staff",
  },
  {
    email: "aaaa@gmail.com",
    name: "이르음",
    role: "수락 대기",
    tone: "pending",
  },
];

const permissionRows: Array<{
  key: PermissionKey;
  label: string;
}> = [
  { key: "programCreate", label: "프로그램 생성" },
  { key: "applicationReview", label: "신청서 확인" },
  { key: "messageReview", label: "메세지 확인" },
  { key: "templateEdit", label: "템플릿 수정" },
  { key: "requiredItem", label: "(필요사항 더 추가)" },
];

const roleHeaders: Array<{
  colorClass: string;
  key: PermissionRole;
  label: string;
}> = [
  { colorClass: "bg-[#C75C36]", key: "host", label: "호스트" },
  { colorClass: "bg-[#F7B267]", key: "manager", label: "운영진" },
  { colorClass: "bg-[#7A8B52]", key: "staff", label: "스태프" },
];

const initialPermissionMatrix: Record<PermissionKey, Record<PermissionRole, boolean>> = {
  applicationReview: { host: true, manager: true, staff: false },
  messageReview: { host: true, manager: true, staff: true },
  programCreate: { host: true, manager: true, staff: false },
  requiredItem: { host: true, manager: false, staff: true },
  templateEdit: { host: true, manager: true, staff: false },
};

export function HostTeamSettingsContent({
  canManageRolePermissions,
}: {
  canManageRolePermissions: boolean;
}) {
  const [permissions, setPermissions] = useState(initialPermissionMatrix);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  function togglePermission(rowKey: PermissionKey, role: PermissionRole) {
    if (!canManageRolePermissions || role === "host") return;

    setPermissions((current) => ({
      ...current,
      [rowKey]: {
        ...current[rowKey],
        [role]: !current[rowKey][role],
      },
    }));
  }

  return (
    <>
      <div className="flex w-[var(--host-547)] max-w-full flex-col gap-[var(--host-33)]">
        <div className="flex items-start gap-[var(--host-22)]">
          <h2 className="text-[var(--host-16)] font-medium leading-[1.253] text-[#0D0D0C]">
            멤버
          </h2>
          {canManageRolePermissions ? (
            <button
              className="inline-flex h-[var(--host-22)] items-center gap-[var(--host-6)] rounded-[var(--host-12)] bg-[#F3F3F3] px-[var(--host-8)] text-[var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:text-[#FE701E]"
              onClick={() => setShowPermissionDialog(true)}
              type="button"
            >
              <Image
                alt=""
                aria-hidden
                className="size-[var(--host-13)]"
                height={16}
                src={nuvioIcons.formItemCondition}
                width={16}
              />
              <span>역할 권한 범위 확인</span>
            </button>
          ) : (
            <span className="rounded-[var(--host-12)] bg-[#F3F3F3] px-[var(--host-8)] py-[2px] text-[var(--host-12)] font-medium leading-[1.253] text-[#CAC4BC]">
              대표 호스트 전용
            </span>
          )}
        </div>
        <div className="flex w-full flex-col gap-[var(--host-8)]">
          {members.map((member) => (
            <TeamMemberRow
              canManageRolePermissions={canManageRolePermissions}
              key={`${member.role}-${member.email}`}
              member={member}
              onOpenPermissions={() => setShowPermissionDialog(true)}
            />
          ))}
        </div>
      </div>

      <div className="flex w-[var(--host-546)] max-w-full flex-col gap-[var(--host-5)]">
        <h2 className="text-[var(--host-16)] font-medium leading-[1.253] text-[#0D0D0C]">
          멤버초대
        </h2>
        <p className="text-[var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A]">
          초대 메일을 수락하면 선택한 역할로 팀에 합류돼요. 역할 변경은 대표
          호스트만 가능해요.
        </p>
        <div className="flex w-full items-center gap-[var(--host-28)]">
          <input
            className="h-[var(--host-31)] w-[var(--host-245)] rounded-[var(--host-7)] border border-[#F7B267] bg-white px-[var(--host-12)] text-[var(--host-12)] font-medium leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#D9D9D9]"
            placeholder="초대할 멤버의 이메일 입력"
            type="email"
          />
          <div className="relative h-[var(--host-31)] w-[var(--host-166)]">
            <select
              className="h-full w-full appearance-none rounded-[var(--host-7)] border border-[#CAC4BC] bg-white px-[var(--host-8)] text-[var(--host-12)] font-medium leading-[1.253] text-[#D9D9D9] outline-none"
              defaultValue=""
            >
              <option disabled value="">
                초대 역할 선택
              </option>
              <option>운영진</option>
              <option>스태프</option>
            </select>
            <Image
              alt=""
              aria-hidden
              className="pointer-events-none absolute right-[var(--host-8)] top-1/2 h-[10px] w-[10px] -translate-y-1/2"
              height={10}
              src={nuvioIcons.formSelectDropdown}
              width={10}
            />
          </div>
          <button
            className="h-[var(--host-30)] w-[var(--host-77)] rounded-[var(--host-6)] bg-[#CAC4BC] text-center text-[var(--host-12)] font-bold leading-[1.6] text-[#F3F3F3]"
            type="button"
          >
            초대장 발송
          </button>
        </div>
      </div>

      {showPermissionDialog ? (
        <RolePermissionDialog
          canSave={canManageRolePermissions}
          onClose={() => setShowPermissionDialog(false)}
          onSave={() => setShowPermissionDialog(false)}
          onToggle={togglePermission}
          permissions={permissions}
        />
      ) : null}
    </>
  );
}

function TeamMemberRow({
  canManageRolePermissions,
  member,
  onOpenPermissions,
}: {
  canManageRolePermissions: boolean;
  member: (typeof members)[number];
  onOpenPermissions: () => void;
}) {
  return (
    <div className="flex min-h-[var(--host-31)] w-full items-center border-b border-[#D9D9D9] py-[var(--host-6)]">
      <RoleBadge tone={member.tone}>{member.role}</RoleBadge>
      <span className="pl-[var(--host-6)] pr-[var(--host-22)] text-[var(--host-14)] font-normal leading-[1.253] text-[#0D0D0C]">
        {member.name}
      </span>
      <span className="min-w-0 flex-1 truncate text-[var(--host-14)] font-normal leading-[1.253] text-[#6D7A8A]">
        {member.email}
      </span>
      {member.tone === "host" ? null : (
        <span className="flex items-center gap-[var(--host-4)] pl-[var(--host-4)]">
          {canManageRolePermissions ? (
            <IconButton
              alt="권한 관리"
              onClick={onOpenPermissions}
              src={nuvioIcons.formItemCondition}
            />
          ) : null}
          <IconButton alt="멤버 삭제" src={nuvioIcons.formItemTrash} />
        </span>
      )}
    </div>
  );
}

function RoleBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: TeamMemberTone;
}) {
  const palette = {
    host: "bg-[#C75C36] text-[#FCFCFC]",
    manager: "bg-[#F7B267] text-[#FCFCFC]",
    pending: "bg-[#6D7A8A] text-[#D9D9D9]",
    staff: "bg-[#7A8B52] text-[#FCFCFC]",
  }[tone];

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[var(--host-6)] px-[var(--host-6)] py-[var(--host-3)] text-[var(--host-12)] font-semibold leading-[1.253] ${palette}`}
    >
      {children}
    </span>
  );
}

function RolePermissionDialog({
  canSave,
  onClose,
  onSave,
  onToggle,
  permissions,
}: {
  canSave: boolean;
  onClose: () => void;
  onSave: () => void;
  onToggle: (rowKey: PermissionKey, role: PermissionRole) => void;
  permissions: Record<PermissionKey, Record<PermissionRole, boolean>>;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 px-[var(--host-24)]"
      onClick={onClose}
      role="dialog"
    >
      <div className="w-[calc(530px*var(--host-scale))] max-w-full">
        <section
          className="rounded-[var(--host-7)] border border-[#FE701E] bg-white px-[var(--host-24)] pb-[var(--host-24)] pt-[var(--host-24)]"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="text-[var(--host-16)] font-medium leading-[1.6] text-[#6D7A8A]">
            대표 호스트만 운영진 / 스태프 권한을 수정할 수 있어요.
          </p>

          <div className="mt-[var(--host-22)] grid grid-cols-[1fr_repeat(3,var(--host-90))] items-center gap-x-[var(--host-8)] border-b border-[#6D7A8A] pb-[var(--host-8)]">
            <span className="text-[var(--host-16)] font-semibold leading-[1.253] text-[#0D0D0C]">
              권한 범위
            </span>
            {roleHeaders.map((role) => (
              <span
                className={`mx-auto inline-flex h-[var(--host-23)] min-w-[var(--host-56)] items-center justify-center rounded-[var(--host-6)] px-[var(--host-8)] text-[var(--host-12)] font-bold leading-[1.253] text-white ${role.colorClass}`}
                key={role.key}
              >
                {role.label}
              </span>
            ))}
          </div>

          <div className="grid">
            {permissionRows.map((row) => (
              <div
                className="grid grid-cols-[1fr_repeat(3,var(--host-90))] items-center gap-x-[var(--host-8)] border-b border-[#D9D9D9] py-[var(--host-8)]"
                key={row.key}
              >
                <span className="text-[var(--host-14)] font-medium leading-[1.253] text-[#0D0D0C]">
                  {row.label}
                </span>
                {roleHeaders.map((role) => (
                  <PermissionCheck
                    checked={permissions[row.key][role.key]}
                    disabled={!canSave || role.key === "host"}
                    key={role.key}
                    role={role.key}
                    onToggle={() => onToggle(row.key, role.key)}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="mt-[var(--host-16)] flex justify-end">
            {canSave ? (
              <button
                className="h-[var(--host-30)] w-[var(--host-77)] rounded-[var(--host-6)] bg-[#FE701E] text-[var(--host-12)] font-medium leading-[1.253] text-white"
                onClick={onSave}
                type="button"
              >
                저장하기
              </button>
            ) : null}
          </div>
        </section>
        <button className="sr-only" onClick={onClose} type="button">
          닫기
        </button>
      </div>
    </div>
  );
}

function PermissionCheck({
  checked,
  disabled,
  onToggle,
  role,
}: {
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  role: PermissionRole;
}) {
  const selectedClass =
    role === "host"
      ? "border-[#FE701E] bg-white text-[#FE701E]"
      : "border-[#FF9A3D] bg-white text-[#FF9A3D]";

  return (
    <button
      aria-pressed={checked}
      className="mx-auto grid size-[var(--host-18)] place-items-center rounded-full disabled:cursor-default"
      disabled={disabled}
      onClick={onToggle}
      type="button"
    >
      <span
        className={`grid size-[var(--host-16)] place-items-center rounded-full border text-[var(--host-11)] font-bold leading-none ${
          checked ? selectedClass : "border-[#CAC4BC] bg-white text-transparent"
        }`}
      >
        {role === "host" ? "●" : "✓"}
      </span>
    </button>
  );
}

function IconButton({
  alt,
  onClick,
  src,
}: {
  alt: string;
  onClick?: () => void;
  src: string;
}) {
  return (
    <button
      aria-label={alt}
      className="grid size-[var(--host-16)] place-items-center"
      onClick={onClick}
      type="button"
    >
      <Image alt="" aria-hidden className="size-full" height={16} src={src} width={16} />
    </button>
  );
}
