import { EventHandlerService } from '@/core/services/event-handler.service';
import { WorkflowExecutor } from '@/core/services/workflow-executor.service';

const eventHandler = EventHandlerService.getInstance();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'RECORDING_STARTED':
      eventHandler.startRecording();
      sendResponse({ success: true });
      break;
    case 'RECORDING_STOPPED':
      const steps = eventHandler.stopRecording();
      sendResponse({ success: true, steps });
      break;
    case 'EXECUTE_WORKFLOW':
      executeWorkflow(message.payload)
        .then((result) => sendResponse({ success: true, result }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

async function executeWorkflow(workflow: any) {
  try {
    const executor = new WorkflowExecutor({
      timeout: 30000,
      retryCount: 3,
      delayBetweenSteps: 1000
    });
    return await executor.executeWorkflow(workflow.steps);
  } catch (error) {
    console.error('Error executing workflow:', error);
    throw error;
  }
}

function injectScript(file: string) {
  const scriptTag = document.createElement('script');
  scriptTag.setAttribute('type', 'text/javascript'); 
  scriptTag.setAttribute('src', chrome.runtime.getURL(file));
  document.documentElement.appendChild(scriptTag);
}

if (process.env.NODE_ENV === 'development') {
  console.log('Content script loaded in development mode');
  (window as any).__webflowWizard = {
    eventHandler,
    startRecording: () => eventHandler.startRecording(),
    stopRecording: () => eventHandler.stopRecording(),
    getRecordingStatus: () => eventHandler.isRecording
  };
}

document.addEventListener('DOMContentLoaded', () => {
  injectScript('inject.js');

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (eventHandler.isRecording) {
        handleDomMutation(mutation);
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });
});

function handleDomMutation(mutation: MutationRecord) {
  if (mutation.type === 'childList') {
    mutation.addedNodes.forEach(node => {
      if (node instanceof HTMLElement) {
        addEventListeners(node);
      }
    });
  } else if (mutation.type === 'attributes') {
    if (mutation.target instanceof HTMLElement) {
      const element = mutation.target;
    }
  }
}

function addEventListeners(element: HTMLElement) {
  element.addEventListener('click', (e) => {
    if (eventHandler.isRecording) {
    }
  });

  element.addEventListener('input', (e) => {
    if (eventHandler.isRecording && e.target instanceof HTMLInputElement) {
    }
  });
}