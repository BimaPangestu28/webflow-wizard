import React, { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface WorkflowRunnerProps {
  workflow: any;
  onComplete: (results: any) => void;
}

export const WorkflowRunner: React.FC<WorkflowRunnerProps> = ({ 
  workflow, 
  onComplete 
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isRunning) {
      chrome.runtime.sendMessage({
        type: 'GET_EXECUTION_STATUS',
      }, (response) => {
        if (response.progress !== progress) {
          setProgress(response.progress);
        }
        if (response.currentStep !== currentStep) {
          setCurrentStep(response.currentStep);
        }
        if (response.error) {
          setError(response.error);
          setIsRunning(false);
        }
      });
    }
  }, [isRunning, progress, currentStep]);

  const handleStart = async () => {
    setIsRunning(true);
    setError(null);
    setResults([]);
    setProgress(0);

    chrome.runtime.sendMessage({
      type: 'EXECUTE_WORKFLOW',
      payload: workflow
    }, (response) => {
      if (response.error) {
        setError(response.error);
        setIsRunning(false);
      }
    });
  };

  const handleStop = () => {
    chrome.runtime.sendMessage({
      type: 'STOP_EXECUTION'
    });
    setIsRunning(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Workflow Runner
          <Button
            variant={isRunning ? "destructive" : "default"}
            size="sm"
            onClick={isRunning ? handleStop : handleStart}
          >
            {isRunning ? (
              <><Pause className="mr-2 h-4 w-4" /> Stop</>
            ) : (
              <><Play className="mr-2 h-4 w-4" /> Start</>
            )}
          </Button>
        </CardTitle>
        <CardDescription>
          Execute and monitor your workflow
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>

          {/* Current Step */}
          {currentStep !== null && (
            <Alert>
              <RefreshCw className="h-4 w-4" />
              <AlertTitle>Current Step</AlertTitle>
              <AlertDescription>
                Executing step {currentStep + 1} of {workflow.steps.length}:
                {' '}{workflow.steps[currentStep].type}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {results.length > 0 && (
            <Accordion type="single" collapsible>
              <AccordionItem value="results">
                <AccordionTrigger>
                  Execution Results
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {results.map((result, index) => (
                      <Alert key={index} variant={result.success ? "default" : "destructive"}>
                        {result.success ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <AlertTitle>
                          Step {index + 1}: {workflow.steps[index].type}
                        </AlertTitle>
                        <AlertDescription>
                          {result.success ? (
                            `Completed in ${result.duration}ms`
                          ) : (
                            result.error
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      </CardContent>

      <CardFooter className="text-sm text-muted-foreground">
        {isRunning ? (
          'Workflow is running...'
        ) : results.length > 0 ? (
          `Execution completed with ${results.filter(r => r.success).length} successful steps`
        ) : (
          'Ready to execute workflow'
        )}
      </CardFooter>
    </Card>
  );
};