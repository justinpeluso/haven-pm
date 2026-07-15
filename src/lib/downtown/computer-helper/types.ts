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
  summarySteps: string[];
  detailedSteps: HelperStep[];
  option2: HelperOption2;
  mode: "llm" | "offline";
  topic?: string;
  note?: string;
};
