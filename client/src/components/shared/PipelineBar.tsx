import './PipelineBar.css';

export interface PipelineStep {
  key: string;
  label: string;
}

interface PipelineBarProps {
  steps: PipelineStep[];
  currentStep: string;
  completedSteps: string[];
}

export const PipelineBar = ({ steps, currentStep, completedSteps }: PipelineBarProps) => (
  <div className="pipeline-bar">
    {steps.map((step, i) => {
      const isCompleted = completedSteps.includes(step.key);
      const isCurrent = step.key === currentStep;
      let cls = 'pipeline-step';
      if (isCompleted) cls += ' pipeline-step--completed';
      else if (isCurrent) cls += ' pipeline-step--current';
      else cls += ' pipeline-step--future';
      if (i === 0) cls += ' pipeline-step--first';
      if (i === steps.length - 1) cls += ' pipeline-step--last';
      return (
        <div key={step.key} className={cls}>
          {isCompleted ? '✓ ' : isCurrent ? '● ' : ''}{step.label}
        </div>
      );
    })}
  </div>
);
