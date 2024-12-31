import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { RecorderControls } from "@/features/recorder/components/RecorderControls";
import { WorkflowBuilder } from "@/features/workflow/components/WorkflowBuilder";
import { DraggableWindow } from "./components/DraggableWindow";

export const App = () => {
  return (
    <DraggableWindow>
      <div className="p-4 w-[800px]">
        <Tabs defaultValue="record">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="record">Record</TabsTrigger>
            <TabsTrigger value="edit">Edit Workflow</TabsTrigger>
          </TabsList>
          <TabsContent value="record">
            <RecorderControls />
          </TabsContent>
          <TabsContent value="edit">
            <WorkflowBuilder />
          </TabsContent>
        </Tabs>
      </div>
    </DraggableWindow>
  );
};
