import type { Role } from "../shared/types.js";

/** Jobs that appear in every team, in the order they are added. */
export const BASE_ROLES: Readonly<Record<string, Role>> = {
  primary: {
    id: "primary",
    kind: "Primary model",
    label: "Primary model",
    purpose: "Handle the main conversation and bring the team's work together.",
    role: "primary",
  },
  planner: {
    id: "planner",
    kind: "Coordinator",
    label: "Planning and coordination",
    purpose: "Break complex work into steps, choose tools and recover when something fails.",
    role: "planner",
  },
  worker: {
    id: "worker",
    kind: "Routine work",
    label: "Routine-task model",
    purpose: "Handle extraction, sorting, drafting and other repeatable work at lower cost.",
    role: "worker",
  },
  validator: {
    id: "validator",
    kind: "Checker",
    label: "Quality and safety checker",
    purpose: "Check evidence, rules and important answers before users rely on them.",
    role: "validator",
  },
  evidence: {
    id: "evidence",
    kind: "Independent check",
    label: "Evidence checker",
    purpose: "Challenge important claims and confirm sources independently of the primary model.",
    role: "researcher",
  },
};

/** Jobs added only when the brief calls for them. */
export const SPECIALIST_ROLES: Readonly<Record<string, Role>> = {
  coding: {
    id: "coder",
    kind: "Specialist",
    label: "Coding specialist",
    purpose: "Read software projects, write code and test the changes.",
    role: "coder",
  },
  research: {
    id: "researcher",
    kind: "Specialist",
    label: "Research specialist",
    purpose: "Find current sources, keep citations and separate facts from conclusions.",
    role: "researcher",
  },
  vision: {
    id: "vision",
    kind: "Specialist",
    label: "Image and document specialist",
    purpose: "Understand screens, images, forms, diagrams and video.",
    role: "vision",
  },
  voice: {
    id: "voice",
    kind: "Specialist",
    label: "Voice specialist",
    purpose: "Handle fast speech, interruptions and natural conversation.",
    role: "voice",
  },
  private: {
    id: "private",
    kind: "Specialist",
    label: "Private or local model",
    purpose: "Keep sensitive or offline work in a private or local setup.",
    role: "private",
  },
  geospatial: {
    id: "geospatial",
    kind: "Specialist",
    label: "Geospatial reasoning specialist",
    purpose: "Work with map descriptions and location evidence alongside a real GIS or spatial database.",
    role: "vision",
  },
};
