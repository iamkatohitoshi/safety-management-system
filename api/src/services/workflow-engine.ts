/**
 * Workflow Engine — a pure state machine for approval workflows.
 *
 * Provides stateless functions to determine the next step in an approval
 * chain, check whether a workflow is complete, and verify user permissions
 * for a given step.
 *
 * No database calls — all functions are deterministic based on inputs.
 */

/**
 * Represents a single step in an approval workflow.
 */
export interface WorkflowStep {
  /** Order of this step within the workflow (1-based). */
  step_order: number;

  /** Human-readable name for this step (e.g. "Supervisor Review"). */
  name: string;

  /** The role that is allowed to act on this step. */
  assignee_role: string;

  /**
   * Execution model for this step:
   *   - 'sequential' — must be completed before moving to the next step
   *   - 'parallel'   — can be completed in any order with other parallel steps
   *     at the same step_order (not yet fully enforced by this engine)
   */
  type: 'sequential' | 'parallel';

  /** Optional: description of what needs to happen at this step. */
  description?: string;

  /** Optional: minimum number of approvals needed (for parallel steps). */
  required_approvals?: number;
}

/** Possible actions a user can take on a workflow step. */
export type WorkflowAction = 'approve' | 'reject' | 'request_revision';

/**
 * Determine the next step order given the current step and an action.
 *
 * Rules:
 *   - 'approve': advance to the next sequential step (step_order + 1)
 *   - 'reject': reset to step 1 (or return null — configurable)
 *   - 'request_revision': go back one step (step_order - 1), minimum 1
 *
 * @param currentStep - The step_order the user is currently acting on
 * @param action      - The action taken
 * @param steps       - The full workflow step definitions
 * @returns The next step_order, or null if the workflow is finished or invalid
 */
export function getNextStep(
  currentStep: number,
  action: WorkflowAction,
  steps: WorkflowStep[],
): number | null {
  if (steps.length === 0) {
    return null;
  }

  switch (action) {
    case 'approve': {
      const next = currentStep + 1;
      // Check if the next step exists in the steps array
      const exists = steps.some((s) => s.step_order === next);
      return exists ? next : null; // null means workflow complete
    }

    case 'reject': {
      // Rejection resets back to the first step for re-work
      return 1;
    }

    case 'request_revision': {
      // Go back one step, but never below step 1
      return Math.max(1, currentStep - 1);
    }

    default:
      return null;
  }
}

/**
 * Check whether the workflow is complete at the given step.
 *
 * A workflow is complete when `currentStep` exceeds the highest
 * step_order defined in the steps array.
 *
 * @param currentStep - The current step_order
 * @param steps       - The full workflow step definitions
 * @returns `true` if all steps have been completed
 */
export function isWorkflowComplete(currentStep: number, steps: WorkflowStep[]): boolean {
  if (steps.length === 0) {
    return true; // No steps means nothing to do
  }

  const maxStepOrder = Math.max(...steps.map((s) => s.step_order));
  return currentStep > maxStepOrder;
}

/**
 * Check whether a user with the given role is allowed to act on a step.
 *
 * @param step      - The workflow step to check
 * @param userRole  - The user's role (e.g. 'admin', 'supervisor', 'worker')
 * @returns `true` if the user's role matches the step's assignee_role
 */
export function canUserActOnStep(step: WorkflowStep, userRole: string): boolean {
  return step.assignee_role === userRole;
}
