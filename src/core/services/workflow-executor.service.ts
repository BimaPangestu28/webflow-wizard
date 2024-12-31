import { WorkflowStep, ExecutionResult } from '@core/types/workflow.types';

interface ExecutionOptions {
  timeout: number;
  retryCount: number;
  delayBetweenSteps: number;
  continueOnError?: boolean;
}

export class WorkflowExecutor {
  private currentStep: number = 0;
  private isRunning: boolean = false;
  private steps: WorkflowStep[] = [];
  private options: ExecutionOptions;

  constructor(options: Partial<ExecutionOptions> = {}) {
    this.options = {
      timeout: 30000,
      retryCount: 3,
      delayBetweenSteps: 1000,
      ...options
    };
  }

  async executeWorkflow(steps: WorkflowStep[]): Promise<ExecutionResult[]> {
    this.steps = steps;
    this.currentStep = 0;
    this.isRunning = true;
    const results: ExecutionResult[] = [];

    try {
      while (this.currentStep < this.steps.length && this.isRunning) {
        const step = this.steps[this.currentStep];
        const result = await this.executeStep(step);
        results.push(result);

        if (!result.success && !this.options.continueOnError) {
          break;
        }

        this.currentStep++;
        if (this.currentStep < this.steps.length) {
          await this.delay(this.options.delayBetweenSteps);
        }
      }
    } catch (error) {
      console.error('Workflow execution error:', error);
    } finally {
      this.isRunning = false;
    }

    return results;
  }

  private async executeStep(step: WorkflowStep): Promise<ExecutionResult> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.options.retryCount) {
      try {
        const result = await this.executeSingleStep(step);
        if (result.success) {
          return result;
        }
        lastError = new Error(result.message);
      } catch (error) {
        lastError = error as Error;
      }

      attempts++;
      if (attempts < this.options.retryCount) {
        await this.delay(1000 * attempts);
      }
    }

    return {
      stepId: step.id,
      success: false,
      message: lastError?.message || 'Step execution failed',
      timestamp: Date.now()
    };
  }

  private async executeSingleStep(step: WorkflowStep): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      switch (step.type) {
        case 'navigation':
          await this.executeNavigation(step);
          break;

        case 'click':
          await this.executeClick(step);
          break;

        case 'input':
          await this.executeInput(step);
          break;

        case 'wait':
          await this.executeWait(step);
          break;

        case 'submit':
          await this.executeSubmit(step);
          break;

        case 'custom':
          await this.executeCustomAction(step);
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      return {
        stepId: step.id,
        success: true,
        timestamp: Date.now(),
        message: `Step completed in ${Date.now() - startTime}ms`
      };

    } catch (error) {
      return {
        stepId: step.id,
        success: false,
        message: (error as Error).message,
        timestamp: Date.now()
      };
    }
  }

  private async executeNavigation(step: WorkflowStep): Promise<void> {
    const { url } = step.config;
    if (!url) throw new Error('URL is required for navigation step');

    await this.waitForNavigation(() => {
      window.location.href = url;
    });
  }

  private async executeClick(step: WorkflowStep): Promise<void> {
    const element = await this.waitForElement(step.config.selector);
    if (!element) {
      throw new Error(`Element not found: ${step.config.selector}`);
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.delay(300);

    const isClickable = await this.isElementClickable(element);
    if (!isClickable) {
      throw new Error(`Element is not clickable: ${step.config.selector}`);
    }

    (element as HTMLElement).click();
  }

  private async executeInput(step: WorkflowStep): Promise<void> {
    const element = await this.waitForElement(step.config.selector) as HTMLInputElement;
    if (!element) {
      throw new Error(`Input element not found: ${step.config.selector}`);
    }

    element.value = '';
    element.dispatchEvent(new Event('change', { bubbles: true }));

    const value = step.config.value;
    for (let i = 0; i < value.length; i++) {
      element.value += value[i];
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await this.delay(50);
    }

    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private async executeWait(step: WorkflowStep): Promise<void> {
    const { duration, selector } = step.config;

    if (selector) {
      await this.waitForElement(selector);
    } else if (duration) {
      await this.delay(duration);
    } else {
      throw new Error('Wait step requires either duration or selector');
    }
  }

  private async executeSubmit(step: WorkflowStep): Promise<void> {
    const form = await this.waitForElement(step.config.selector) as HTMLFormElement;
    if (!form) {
      throw new Error(`Form not found: ${step.config.selector}`);
    }

    await this.waitForNavigation(() => {
      form.submit();
    });
  }

  private async executeCustomAction(step: WorkflowStep): Promise<void> {
    if (!step.config.code) {
      throw new Error('Custom action requires code');
    }

    const result = await this.executeInSandbox(step.config.code);
    if (!result.success) {
      throw new Error(`Custom action failed: ${result.error}`);
    }
  }

  private async waitForElement(selector: string): Promise<Element> {
    const startTime = Date.now();

    while (Date.now() - startTime < this.options.timeout) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
      await this.delay(100);
    }

    throw new Error(`Timeout waiting for element: ${selector}`);
  }

  private async waitForNavigation(action: () => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Navigation timeout'));
      }, this.options.timeout);

      window.addEventListener('load', () => {
        clearTimeout(timeoutId);
        resolve();
      }, { once: true });

      action();
    });
  }

  private async isElementClickable(element: Element): Promise<boolean> {
    const rect = element.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0;
    
    if (!isVisible) return false;

    const elementAtPoint = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    );

    return element.contains(elementAtPoint);
  }

  private async executeInSandbox(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const sandbox = new Function('step', 'context', code);
      await sandbox(this.steps[this.currentStep], {
        currentStep: this.currentStep,
        totalSteps: this.steps.length
      });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public stopExecution(): void {
    this.isRunning = false;
  }

  public getCurrentProgress(): number {
    return (this.currentStep / this.steps.length) * 100;
  }
}