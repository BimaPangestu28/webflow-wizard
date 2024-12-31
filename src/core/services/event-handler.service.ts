import { nanoid } from 'nanoid';
import { WorkflowStep, WorkflowStepType } from '@core/types/workflow.types';

interface ElementInfo {
  selector: string;
  tag: string;
  innerText?: string;
  attributes: Record<string, string>;
}

export class EventHandlerService {
  private static instance: EventHandlerService;
  isRecording: boolean = false;
  private steps: WorkflowStep[] = [];
  private eventBuffer: { event: Event, timestamp: number }[] = [];
  private bufferTimeout: number = 500;

  private constructor() {
    this.initializeEventListeners();
  }

  static getInstance(): EventHandlerService {
    if (!EventHandlerService.instance) {
      EventHandlerService.instance = new EventHandlerService();
    }
    return EventHandlerService.instance;
  }

  private initializeEventListeners(): void {
    document.addEventListener('click', this.handleClick.bind(this), true);
    document.addEventListener('dblclick', this.handleClick.bind(this), true);
    document.addEventListener('input', this.handleInput.bind(this), true);
    document.addEventListener('submit', this.handleSubmit.bind(this), true);
    document.addEventListener('keydown', this.handleKeydown.bind(this), true);
    window.addEventListener('popstate', this.handleNavigation.bind(this));
    window.addEventListener('hashchange', this.handleNavigation.bind(this));
  }

  private async handleClick(event: MouseEvent): Promise<void> {
    if (!this.isRecording) return;

    const target = event.target as HTMLElement;
    if (!target) return;

    const elementInfo = await this.getElementInfo(target);
    
    this.bufferEvent(event, async () => {
      this.addStep({
        id: nanoid(),
        type: 'click' as WorkflowStepType,
        config: {
          selector: elementInfo.selector,
          innerText: elementInfo.innerText,
          tag: elementInfo.tag,
          attributes: elementInfo.attributes
        },
        timestamp: Date.now()
      });
    });
  }

  private async handleInput(event: Event): Promise<void> {
    if (!this.isRecording) return;

    const target = event.target as HTMLInputElement;
    if (!target) return;

    const elementInfo = await this.getElementInfo(target);
    
    this.addStep({
      id: nanoid(),
      type: 'input' as WorkflowStepType,
      config: {
        selector: elementInfo.selector,
        value: target.type === 'password' ? '*****' : target.value,
        type: target.type,
        isPassword: target.type === 'password'
      },
      timestamp: Date.now()
    });
  }

  private async handleSubmit(event: Event): Promise<void> {
    if (!this.isRecording) return;

    const form = event.target as HTMLFormElement;
    if (!form) return;

    const elementInfo = await this.getElementInfo(form);
    
    this.addStep({
      id: nanoid(),
      type: 'submit' as WorkflowStepType,
      config: {
        selector: elementInfo.selector,
        formData: this.getFormData(form)
      },
      timestamp: Date.now()
    });
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (!this.isRecording) return;

    const isSpecialKey = event.key === 'Enter' || event.key === 'Escape' || 
                        (event.ctrlKey && event.key === 'c') ||
                        (event.ctrlKey && event.key === 'v');

    if (isSpecialKey) {
      this.addStep({
        id: nanoid(),
        type: 'keypress' as WorkflowStepType,
        config: {
          key: event.key,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey
        },
        timestamp: Date.now()
      });
    }
  }

  private handleNavigation(): void {
    if (!this.isRecording) return;

    this.addStep({
      id: nanoid(),
      type: 'navigation' as WorkflowStepType,
      config: {
        url: window.location.href,
        title: document.title
      },
      timestamp: Date.now()
    });
  }

  private async getElementInfo(element: HTMLElement): Promise<ElementInfo> {
    return {
      selector: this.generateUniqueSelector(element),
      tag: element.tagName.toLowerCase(),
      innerText: element.innerText?.trim(),
      attributes: this.getElementAttributes(element)
    };
  }

  private generateUniqueSelector(element: HTMLElement): string {
    const strategies = [
      this.getIdSelector,
      this.getNameSelector,
      this.getAttributeSelector,
      this.getClassSelector,
      this.getPathSelector
    ];

    for (const strategy of strategies) {
      const selector = strategy.call(this, element);
      if (selector && this.isSelectorUnique(selector)) {
        return selector;
      }
    }

    return this.getPathSelector(element);
  }

  private isSelectorUnique(selector: string): boolean {
    const elements = document.querySelectorAll(selector);
    return elements.length === 1;
  }

  private getIdSelector(element: HTMLElement): string | null {
    return element.id ? `#${element.id}` : null;
  }

  private getNameSelector(element: HTMLElement): string | null {
    return element.getAttribute('name') ? 
      `${element.tagName.toLowerCase()}[name="${element.getAttribute('name')}"]` : 
      null;
  }

  private getAttributeSelector(element: HTMLElement): string | null {
    const dataAttrs = Array.from(element.attributes)
      .filter(attr => attr.name.startsWith('data-'));
    
    return dataAttrs.length > 0 ? 
      `[${dataAttrs[0].name}="${dataAttrs[0].value}"]` : 
      null;
  }

  private getClassSelector(element: HTMLElement): string | null {
    const classes = Array.from(element.classList)
      .filter(className => !className.startsWith('random-') && !className.includes('_'));
    
    return classes.length > 0 ? 
      `.${classes.join('.')}` : 
      null;
  }

  private getPathSelector(element: HTMLElement): string {
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      } else {
        const siblings = Array.from(current.parentElement?.children || []);
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
      
      path.unshift(selector);
      current = current.parentElement as HTMLElement;
    }

    return path.join(' > ');
  }

  private getElementAttributes(element: HTMLElement): Record<string, string> {
    const attributes: Record<string, string> = {};
    
    Array.from(element.attributes).forEach(attr => {
      if (!attr.name.startsWith('random-') && !attr.name.includes('_')) {
        attributes[attr.name] = attr.value;
      }
    });

    return attributes;
  }

  private getFormData(form: HTMLFormElement): Record<string, any> {
    const formData: Record<string, any> = {};
    
    Array.from(form.elements).forEach((element: any) => {
      if (element.name && element.value) {
        formData[element.name] = element.type === 'password' ? '*****' : element.value;
      }
    });

    return formData;
  }

  private bufferEvent(event: Event, handler: () => void): void {
    this.eventBuffer.push({
      event,
      timestamp: Date.now()
    });

    setTimeout(() => {
      this.processEventBuffer(handler);
    }, this.bufferTimeout);
  }

  private processEventBuffer(handler: () => void): void {
    const latestEvent = this.eventBuffer[this.eventBuffer.length - 1];
    if (latestEvent) {
      handler();
    }
    
    this.eventBuffer = [];
  }

  private addStep(step: WorkflowStep): void {
    this.steps.push(step);
    this.notifyStepAdded(step);
  }

  private notifyStepAdded(step: WorkflowStep): void {
    chrome.runtime.sendMessage({
      type: 'STEP_ADDED',
      payload: step
    });
  }

  public startRecording(): void {
    this.isRecording = true;
    this.steps = [];
    this.notifyRecordingStarted();
  }

  public stopRecording(): WorkflowStep[] {
    this.isRecording = false;
    this.notifyRecordingStopped();
    return this.steps;
  }

  private notifyRecordingStarted(): void {
    chrome.runtime.sendMessage({
      type: 'RECORDING_STARTED'
    });
  }

  private notifyRecordingStopped(): void {
    chrome.runtime.sendMessage({
      type: 'RECORDING_STOPPED',
      payload: this.steps
    });
  }
}

const eventHandler = EventHandlerService.getInstance();