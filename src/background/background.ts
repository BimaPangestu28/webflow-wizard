import { WorkflowStep, ExecutionResult, WorkflowStepType, Workflow } from '@/core/types/workflow.types';
import { nanoid } from 'nanoid';

interface WorkflowExecutorOptions {
  timeout: number;
  retryCount: number;
  delayBetweenSteps: number;
  onProgress: (progress: number, step: number) => void;
}

class WorkflowExecutor {
  private isExecuting: boolean = false;
  private currentStep: number = 0;
  private totalSteps: number = 0;
  private options: WorkflowExecutorOptions;

  constructor(options: WorkflowExecutorOptions) {
    this.options = options;
  }

  async executeWorkflow(steps: WorkflowStep[]): Promise<ExecutionResult[]> {
    this.isExecuting = true;
    this.currentStep = 0;
    this.totalSteps = steps.length;
    const results: ExecutionResult[] = [];

    try {
      for (let i = 0; i < steps.length; i++) {
        if (!this.isExecuting) break;
        
        this.currentStep = i;
        const progress = Math.round((i / steps.length) * 100);
        this.options.onProgress(progress, i);

        const result = await this.executeStep(steps[i]);
        results.push(result);

        if (i < steps.length - 1) {
          await this.delay(this.options.delayBetweenSteps);
        }
      }
    } finally {
      this.isExecuting = false;
    }

    return results;
  }

  stopExecution(): void {
    this.isExecuting = false;
  }

  getCurrentProgress(): number {
    return Math.round((this.currentStep / this.totalSteps) * 100);
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  private async executeStep(step: WorkflowStep): Promise<ExecutionResult> {
    return {
      success: true,
      stepId: step.id,
      timestamp: Date.now()
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class BackgroundService {
  private isRecording: boolean = false;
  private currentWorkflow: {
    steps: WorkflowStep[];
    tabId?: number;
  } = {
    steps: []
  };
  private executor: WorkflowExecutor | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await this.initializeMessageListeners();
      await this.initializeTabListeners();
      await this.initializeContextMenus();
    } catch (error) {
      console.error('Error initializing background service:', error);
    }
  }

  private initializeMessageListeners(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
  }

  private initializeTabListeners(): void {
    chrome.tabs.onActivated.addListener(({ tabId }) => {
      if (this.isRecording && this.currentWorkflow.tabId !== tabId) {
        this.handleTabChange(tabId);
      }
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (this.isRecording && changeInfo.status === 'complete') {
        this.handleTabUpdate(tabId, tab.url);
      }
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      if (this.currentWorkflow.tabId === tabId) {
        this.handleTabClosed(tabId);
      }
    });
  }

  private async initializeContextMenus(): Promise<void> {
    if (chrome.contextMenus) {
      try {
        await chrome.contextMenus.removeAll();

        chrome.contextMenus.create({
          id: 'startRecording',
          title: 'Start Recording',
          contexts: ['action']
        });

        chrome.contextMenus.create({
          id: 'stopRecording',
          title: 'Stop Recording',
          contexts: ['action']
        });

        chrome.contextMenus.onClicked.addListener((info, tab) => {
          if (info.menuItemId === 'startRecording') {
            this.handleStartRecording(tab?.id);
          } else if (info.menuItemId === 'stopRecording') {
            this.handleStopRecording();
          }
        });
      } catch (error) {
        console.error('Error creating context menus:', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  private async handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): Promise<void> {
    try {
      switch (message.type) {
        case 'START_RECORDING':
          await this.handleStartRecording(sender.tab?.id);
          sendResponse({ success: true });
          break;

        case 'STOP_RECORDING':
          await this.handleStopRecording();
          sendResponse({ success: true });
          break;

        case 'STEP_ADDED':
          this.handleStepAdded(message.payload);
          sendResponse({ success: true });
          break;

        case 'GET_RECORDING_STATE':
          sendResponse({
            isRecording: this.isRecording,
            currentWorkflow: this.currentWorkflow
          });
          break;

        case 'SAVE_WORKFLOW':
          await this.handleSaveWorkflow(message.payload);
          sendResponse({ success: true });
          break;

        case 'LOAD_WORKFLOW':
          const workflow = await this.handleLoadWorkflow(message.payload.id);
          sendResponse({ workflow });
          break;

        case 'EXECUTE_WORKFLOW':
          const result = await this.handleExecuteWorkflow(message.payload);
          sendResponse({ success: true, result });
          break;

        case 'STOP_EXECUTION':
          this.handleStopExecution();
          sendResponse({ success: true });
          break;

        case 'GET_EXECUTION_STATUS':
          sendResponse(this.getExecutionStatus());
          break;

        case 'DELETE_WORKFLOW':
          await this.handleDeleteWorkflow(message.payload.id);
          sendResponse({ success: true });
          break;

        case 'UPDATE_WORKFLOW':
          await this.handleUpdateWorkflow(message.payload);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private handleStepAdded(step: WorkflowStep): void {
    if (this.isRecording) {
      this.currentWorkflow.steps.push(step);
    }
  }

  private handleTabChange(tabId: number): void {
    const step: WorkflowStep = {
      id: nanoid(),
      type: 'tab_switch' as WorkflowStepType,
      config: { tabId },
      timestamp: Date.now()
    };
    this.currentWorkflow.steps.push(step);
  }

  private handleTabUpdate(tabId: number, url?: string): void {
    if (url) {
      const step: WorkflowStep = {
        id: nanoid(),
        type: 'navigation',
        config: { url },
        timestamp: Date.now()
      };
      this.currentWorkflow.steps.push(step);
    }
  }

  private async handleStartRecording(tabId?: number): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    this.isRecording = true;
    this.currentWorkflow = {
      steps: [],
      tabId
    };

    await this.updateExtensionState('recording');
    
    if (tabId) {
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'RECORDING_STARTED' });
      } catch (error) {
        console.error('Error starting recording:', error);
        this.handleRecordingError('Failed to start recording in tab');
      }
    }
  }

  private async handleStopRecording(): Promise<void> {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }

    this.isRecording = false;
    await this.updateExtensionState('idle');

    if (this.currentWorkflow.tabId) {
      try {
        await chrome.tabs.sendMessage(this.currentWorkflow.tabId, {
          type: 'RECORDING_STOPPED',
          payload: this.currentWorkflow.steps
        });
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    }

    await this.handleSaveWorkflow({
      name: `Workflow ${new Date().toLocaleString()}`,
      steps: this.currentWorkflow.steps
    });
  }

  private async handleSaveWorkflow(workflow: Partial<Workflow>): Promise<void> {
    try {
      const workflows = await this.getStoredWorkflows();
      const newWorkflow: Workflow = {
        id: nanoid(),
        name: workflow.name || 'Untitled Workflow',
        steps: workflow.steps || [],
        created: new Date(),
        modified: new Date(),
        description: workflow.description || '',
        tags: workflow.tags || []
      };

      workflows.push(newWorkflow);
      await chrome.storage.local.set({ workflows });

      try {
        await chrome.runtime.sendMessage({
          type: 'WORKFLOW_SAVED',
          payload: newWorkflow
        });
      } catch (error) {}
    } catch (error) {
      console.error('Error saving workflow:', error);
      throw error;
    }
  }

  private async handleLoadWorkflow(id: string): Promise<Workflow> {
    try {
      const workflows = await this.getStoredWorkflows();
      const workflow = workflows.find(w => w.id === id);
      if (!workflow) {
        throw new Error('Workflow not found');
      }
      return workflow;
    } catch (error) {
      console.error('Error loading workflow:', error);
      throw error;
    }
  }

  private async handleExecuteWorkflow(workflow: Workflow): Promise<ExecutionResult[]> {
    try {
      if (!workflow.steps.length) {
        throw new Error('Workflow has no steps');
      }

      this.executor = new WorkflowExecutor({
        timeout: 30000,
        retryCount: 3,
        delayBetweenSteps: 1000,
        onProgress: this.handleExecutionProgress.bind(this)
      });

      const results = await this.executor.executeWorkflow(workflow.steps);
      this.notifyExecutionComplete(results);
      return results;
    } catch (error) {
      this.handleExecutionError(error as Error);
      throw error;
    } finally {
      this.executor = null;
    }
  }

  private handleStopExecution(): void {
    if (this.executor) {
      this.executor.stopExecution();
      this.executor = null;
    }
  }

  private async updateExtensionState(state: 'idle' | 'recording' | 'executing'): Promise<void> {
    const icons = {
      idle: {
        "16": "/icons/idle-16.png",
        "48": "/icons/idle-48.png",
        "128": "/icons/idle-128.png"
      },
      recording: {
        "16": "/icons/recording-16.png",
        "48": "/icons/recording-48.png",
        "128": "/icons/recording-128.png"
      },
      executing: {
        "16": "/icons/executing-16.png",
        "48": "/icons/executing-48.png",
        "128": "/icons/executing-128.png"
      }
    };

    await chrome.action.setIcon({ path: icons[state] });
  }

  private getExecutionStatus() {
    if (!this.executor) {
      return { status: 'idle' };
    }

    return {
      status: 'executing',
      progress: this.executor.getCurrentProgress(),
      currentStep: this.executor.getCurrentStep()
    };
  }

  private async getStoredWorkflows(): Promise<Workflow[]> {
    const data = await chrome.storage.local.get('workflows');
    return data.workflows || [];
  }

  private async handleDeleteWorkflow(id: string): Promise<void> {
    try {
      const workflows = await this.getStoredWorkflows();
      const updatedWorkflows = workflows.filter(w => w.id !== id);
      await chrome.storage.local.set({ workflows: updatedWorkflows });
    } catch (error) {
      console.error('Error deleting workflow:', error);
      throw error;
    }
  }

  private async handleUpdateWorkflow(workflow: Workflow): Promise<void> {
    try {
      const workflows = await this.getStoredWorkflows();
      const index = workflows.findIndex(w => w.id === workflow.id);
      if (index === -1) {
        throw new Error('Workflow not found');
      }

      workflows[index] = {
        ...workflow,
        modified: new Date()
      };

      await chrome.storage.local.set({ workflows });
    } catch (error) {
      console.error('Error updating workflow:', error);
      throw error;
    }
  }

  private handleExecutionProgress(progress: number, step: number): void {
    chrome.runtime.sendMessage({
      type: 'EXECUTION_PROGRESS',
      payload: { progress, step }
    }).catch(() => {});
  }

  private handleExecutionError(error: Error): void {
    chrome.runtime.sendMessage({
      type: 'EXECUTION_ERROR',
      payload: { error: error.message }
    }).catch(() => {});
  }

  private notifyExecutionComplete(results: ExecutionResult[]): void {
    chrome.runtime.sendMessage({
      type: 'EXECUTION_COMPLETE',
      payload: { results }
    }).catch(() => {});
  }

  private handleRecordingError(message: string): void {
    this.isRecording = false;
    this.updateExtensionState('idle');
    
    chrome.runtime.sendMessage({
      type: 'RECORDING_ERROR',
      payload: { error: message }
    }).catch(() => {});
  }

  private handleTabClosed(tabId: number): void {
    if (this.isRecording) {
      const step: WorkflowStep = {
        id: nanoid(),
        type: 'tab_closed' as WorkflowStepType,
        config: { tabId },
        timestamp: Date.now()
      };
      this.currentWorkflow.steps.push(step);
      this.handleStopRecording();
    }
  }
}

declare var self: ServiceWorkerGlobalScope;
const backgroundService = new BackgroundService();

self.addEventListener('install', (event: ExtendableEvent) => {
  void self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

if (process.env.NODE_ENV === 'development') {
  (self as any).backgroundService = backgroundService;
}

export default backgroundService;