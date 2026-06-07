import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function assertIncludes(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`${label}: expected to find ${JSON.stringify(expected)}`);
  }
}

function assertNotIncludes(source, unexpected, label) {
  if (source.includes(unexpected)) {
    throw new Error(`${label}: unexpected ${JSON.stringify(unexpected)}`);
  }
}

const hostCenterHome = read("src/components/host-center-home.tsx");
const hostProjectHub = read("src/components/host-project-hub.tsx");
const hostProgramHub = read("src/components/host-program-hub.tsx");
const hostWorkspaceUi = read("src/components/host-workspace-ui.tsx");
const readiness = read("src/lib/host-program-publish-readiness.ts");
const deleteRoute = read("src/app/api/host/programs/[id]/route.ts");

const hostSources = [
  hostCenterHome,
  hostProjectHub,
  hostProgramHub,
  hostWorkspaceUi,
].join("\n");

assertNotIncludes(hostSources, "프로그램추가", "host program action label");
assertIncludes(
  hostCenterHome,
  "HostSmallButton onClick={openProgramDialog}>새 프로그램</HostSmallButton>",
  "host home new program button",
);
assertIncludes(hostCenterHome, "function buildStandaloneNewProgramDraft", "host home create draft");
assertIncludes(hostCenterHome, "hostStandaloneProgramPath(savedProgram.id)}?panel=dashboard&created=1", "host home redirect");
assertIncludes(hostProjectHub, "function NewProgramDialog", "folder new program popup");
assertIncludes(hostProjectHub, "생성하기", "folder new program submit");
assertIncludes(hostProjectHub, "hostProgramPath(activeProject.id, savedProgram.id)}?panel=dashboard&created=1", "folder redirect");

for (const state of ["creating", "upcoming", "open", "ended"]) {
  assertIncludes(hostProgramHub, state, `dashboard state ${state}`);
}

assertIncludes(hostProgramHub, "data-program-dashboard={dashboardState}", "dashboard data marker");
assertIncludes(hostProgramHub, 'if (!readyToPublish) return "creating";', "creating state guard");
assertIncludes(hostProgramHub, 'return "ended";', "ended state guard");
assertIncludes(hostProgramHub, "오픈 예약하기", "open schedule button");
assertIncludes(hostProgramHub, "아직 필수 항목들이 작성되지 않았어요!", "required onboarding popup");
assertIncludes(hostProgramHub, "setDashboardDialog(\"onboarding-required\")", "open schedule blocker");
assertIncludes(hostProgramHub, "function OpenScheduleDialog", "open schedule dialog");
assertIncludes(hostProgramHub, "function DeleteProgramDialog", "dashboard delete dialog");
assertIncludes(hostProgramHub, "canDelete={canDeleteBeforeOnboarding}", "dashboard delete guard wiring");
assertIncludes(hostProgramHub, "disabled={!canDelete}", "dashboard delete disabled guard");
assertIncludes(hostProgramHub, "allowCompleted ? \"?mode=management\" : \"\"", "managed delete API mode");
assertIncludes(hostProgramHub, "onDelete={() => void deleteProgram({ allowCompleted: true })}", "side tab managed delete");
assertIncludes(hostProgramHub, "해당 프로그램에 대한 모든 데이터는 영구적으로 삭제 후 복구할 수 없어요", "side tab delete confirmation");

for (const checklistId of [
  "basic",
  "detail",
  "schedule",
  "place",
  "application-form",
  "operation",
]) {
  assertIncludes(readiness, `id: "${checklistId}"`, `readiness checklist ${checklistId}`);
}

assertIncludes(readiness, "hasMeaningfulText", "readiness placeholder guard");
assertIncludes(readiness, "hasMeaningfulSummary", "readiness summary guard");
assertIncludes(readiness, "hasMeaningfulDescription", "readiness description guard");
assertIncludes(deleteRoute, "const allowCompletedDelete = mode === \"management\";", "managed delete route mode");
assertIncludes(deleteRoute, "if (!allowCompletedDelete && (program.published || blockers.length === 0))", "quick delete route guard");

for (const source of [hostCenterHome, hostProjectHub, hostProgramHub]) {
  assertNotIncludes(source, "max-w-[603px]", "1920-scaled popup width");
}

console.log("Host program flow verification passed.");
