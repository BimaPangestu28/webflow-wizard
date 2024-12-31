import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Workflow, WorkflowStep } from "@core/types/workflow.types";
import { nanoid } from "nanoid";

interface WorkflowState {
  workflows: Workflow[];
  activeWorkflow?: Workflow;
  currentWorkflow?: Workflow;
  isRecording: boolean;
  steps: WorkflowStep[];
  addWorkflow: (workflow: Workflow) => void;
  setActiveWorkflow: (id: string) => void;
  setCurrentWorkflow: (workflow: Workflow) => void;
  toggleRecording: () => void;
  addStep: (step: Omit<WorkflowStep, "id">) => void;
  removeStep: (stepId: string) => void;
  updateStep: (stepId: string, updates: Partial<WorkflowStep>) => void;
  clearSteps: () => void;
  reorderSteps: (startIndex: number, endIndex: number) => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  immer((set) => ({
    workflows: [],
    isRecording: false,
    steps: [],

    addWorkflow: (workflow) =>
      set((state) => {
        state.workflows.push(workflow);
      }),

    setActiveWorkflow: (id) =>
      set((state) => {
        const workflow = state.workflows.find(
          (w: { id: string }) => w.id === id
        );
        state.activeWorkflow = workflow;
        if (workflow) {
          state.steps = workflow.steps;
        }
      }),

    setCurrentWorkflow: (workflow) =>
      set((state) => {
        state.currentWorkflow = workflow;
      }),

    toggleRecording: () =>
      set((state) => {
        state.isRecording = !state.isRecording;
        if (!state.isRecording) {
          state.steps = [];
        }
      }),

    addStep: (stepData) =>
      set((state) => {
        const newStep: WorkflowStep = {
          id: nanoid(),
          ...stepData,
        };
        state.steps.push(newStep);
      }),

    removeStep: (stepId) =>
      set((state) => {
        state.steps = state.steps.filter(
          (step: { id: string }) => step.id !== stepId
        );
      }),

    updateStep: (stepId, updates) =>
      set((state) => {
        const stepIndex = state.steps.findIndex(
          (step: { id: string }) => step.id === stepId
        );
        if (stepIndex !== -1) {
          state.steps[stepIndex] = {
            ...state.steps[stepIndex],
            ...updates,
          };
        }
      }),

    clearSteps: () =>
      set((state) => {
        state.steps = [];
      }),

    reorderSteps: (startIndex: number, endIndex: number) =>
      set((state) => {
        const result = Array.from(state.steps);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        state.steps = result;
      }),
  }))
);

export const useWorkflowSteps = () => useWorkflowStore((state) => state.steps);
export const useIsRecording = () => useWorkflowStore((state) => state.isRecording);
export const useActiveWorkflow = () => useWorkflowStore((state) => state.activeWorkflow);
export const useCurrentWorkflow = () => useWorkflowStore((state) => state.currentWorkflow);