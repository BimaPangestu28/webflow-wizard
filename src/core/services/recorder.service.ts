import { nanoid } from 'nanoid';
import { SelectorService } from './selector.service';

export interface WorkflowStep {
  id: string;
  type: 'click' | 'input' | 'submit';
  config: {
    selector: string;
    text?: string;
    value?: string;
  };
}

export class RecorderService {
  private isRecording: boolean = false;
  private steps: WorkflowStep[] = [];
  private selectorService: SelectorService;

  constructor() {
    this.selectorService = new SelectorService();
    this.setupListeners();
  }

  private setupListeners() {
    document.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('change', this.handleInput.bind(this));
    document.addEventListener('submit', this.handleSubmit.bind(this));
  }

  private handleClick(event: MouseEvent) {
    if (!this.isRecording) return;
    
    const element = event.target as HTMLElement;
    const selector = this.selectorService.generateSelector(element);
    
    this.addStep({
      id: nanoid(),
      type: 'click',
      config: {
        selector,
        text: element.textContent?.trim()
      }
    });
  }

  private handleInput(event: Event) {
    if (!this.isRecording) return;
    
    const element = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const selector = this.selectorService.generateSelector(element as HTMLElement);
    
    this.addStep({
      id: nanoid(),
      type: 'input',
      config: {
        selector,
        value: element.value
      }
    });
  }

  private handleSubmit(event: SubmitEvent) {
    if (!this.isRecording) return;
    
    const element = event.target as HTMLFormElement;
    const selector = this.selectorService.generateSelector(element);
    
    this.addStep({
      id: nanoid(),
      type: 'submit',
      config: {
        selector
      }
    });
  }

  private addStep(step: WorkflowStep) {
    this.steps.push(step);
  }

  public startRecording() {
    this.isRecording = true;
    this.steps = [];
  }

  public stopRecording(): WorkflowStep[] {
    this.isRecording = false;
    return this.steps;
  }

  public getSteps(): WorkflowStep[] {
    return [...this.steps];
  }
}
