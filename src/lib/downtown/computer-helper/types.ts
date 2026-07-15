export type HelperOs =
  | "windows"
  | "macos"
  | "linux"
  | "chromeos"
  | "ios"
  | "android"
  | "unsure";

export const HELPER_OS_OPTIONS: { id: HelperOs; label: string }[] = [
  { id: "windows", label: "Windows" },
  { id: "macos", label: "macOS" },
  { id: "linux", label: "Linux" },
  { id: "chromeos", label: "ChromeOS" },
  { id: "ios", label: "iOS" },
  { id: "android", label: "Android" },
  { id: "unsure", label: "Not sure" },
];

export const HELPER_OS_LABELS: Record<HelperOs, string> = Object.fromEntries(
  HELPER_OS_OPTIONS.map((o) => [o.id, o.label])
) as Record<HelperOs, string>;

export type HelperStep = {
  title: string;
  detail: string;
};

export type HelperOption2 = {
  summary: string;
  steps: HelperStep[];
};

export type ComputerHelperPlan = {
  query: string;
  os: HelperOs;
  osLabel: string;
  summarySteps: string[];
  detailedSteps: HelperStep[];
  option2: HelperOption2;
  mode: "llm" | "offline";
  topic?: string;
  note?: string;
  researchUsed?: boolean;
};
