import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkflowStore } from '@/core/store/workflow.store';
import { Play, Square, Download } from 'lucide-react';

export const RecorderControls = () => {
  const { isRecording, toggleRecording, currentWorkflow } = useWorkflowStore();

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>WebFlow Wizard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <Button 
            variant={isRecording ? "destructive" : "default"}
            className="w-full"
            onClick={toggleRecording}
          >
            {isRecording ? (
              <><Square className="mr-2 h-4 w-4" /> Stop Recording</>
            ) : (
              <><Play className="mr-2 h-4 w-4" /> Start Recording</>
            )}
          </Button>

          {currentWorkflow && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {/* Download logic */}}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Workflow
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
