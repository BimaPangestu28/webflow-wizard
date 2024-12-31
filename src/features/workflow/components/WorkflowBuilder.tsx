import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Plus, X, ChevronDown } from "lucide-react";
import { useWorkflowStore } from "@/core/store/workflow.store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkflowStep, WorkflowStepType } from "@core/types/workflow.types";

interface StepType {
  value: WorkflowStepType;
  label: string;
}

export const WorkflowBuilder = () => {
  const { steps, addStep, removeStep, updateStep } = useWorkflowStore((state) => ({
    steps: state.steps,
    addStep: state.addStep,
    removeStep: state.removeStep,
    updateStep: state.updateStep,
  }));

  const stepTypes: StepType[] = [
    { value: "navigation", label: "Navigate" },
    { value: "click", label: "Click Element" },
    { value: "input", label: "Input Text" },
    { value: "submit", label: "Submit Form" },
    { value: "wait", label: "Wait" },
    { value: "custom", label: "Custom Action" },
    { value: "tab_switch", label: "Switch Tab" },
    { value: "tab_closed", label: "Close Tab" },
  ];

  const handleUpdateStepType = (stepId: string, newType: WorkflowStepType) => {
    updateStep(stepId, { type: newType });
  };

  const handleUpdateUrl = (stepId: string, url: string) => {
    updateStep(stepId, { config: { url } });
  };

  const handleAddStep = () => {
    const newStep: Omit<WorkflowStep, "id"> = {
      type: "navigation",
      config: {},
      timestamp: Date.now()
    };
    addStep(newStep);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Workflow Steps</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step: WorkflowStep, index: number) => (
            <Card key={step.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <GripVertical className="text-gray-400" size={20} />
                  <span className="font-medium">Step {index + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStep(step.id)}
                    className="ml-auto"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                        >
                          {stepTypes.find((t) => t.value === step.type)?.label}
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[200px]">
                        {stepTypes.map((type) => (
                          <DropdownMenuItem
                            key={type.value}
                            onClick={() => handleUpdateStepType(step.id, type.value)}
                          >
                            {type.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {step.type === "navigation" && (
                    <div className="grid gap-2">
                      <Label>URL</Label>
                      <Input
                        placeholder="https://example.com"
                        value={step.config.url || ""}
                        onChange={(e) => handleUpdateUrl(step.id, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleAddStep}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Step
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};