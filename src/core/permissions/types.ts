export enum MessageBusType {
  TOOL_CONFIRMATION_REQUEST = 'tool-confirmation-request',
  TOOL_CONFIRMATION_RESPONSE = 'tool-confirmation-response',
  TOOL_POLICY_REJECTION = 'tool-policy-rejection',
  TOOL_EXECUTION_SUCCESS = 'tool-execution-success',
  TOOL_EXECUTION_FAILURE = 'tool-execution-failure',
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ToolConfirmationRequest {
  type: MessageBusType.TOOL_CONFIRMATION_REQUEST;
  toolCall: ToolCall;
  correlationId: string;
}

export interface ToolConfirmationResponse {
  type: MessageBusType.TOOL_CONFIRMATION_RESPONSE;
  correlationId: string;
  confirmed: boolean;
}

export interface ToolPolicyRejection {
  type: MessageBusType.TOOL_POLICY_REJECTION;
  toolCall: ToolCall;
}

export interface ToolExecutionSuccess<T = unknown> {
  type: MessageBusType.TOOL_EXECUTION_SUCCESS;
  toolCall: ToolCall;
  result: T;
}

export interface ToolExecutionFailure<E = Error> {
  type: MessageBusType.TOOL_EXECUTION_FAILURE;
  toolCall: ToolCall;
  error: E;
}

export type Message =
  | ToolConfirmationRequest
  | ToolConfirmationResponse
  | ToolPolicyRejection
  | ToolExecutionSuccess
  | ToolExecutionFailure;

export enum ToolConfirmationOutcome {
  ProceedOnce = 'proceed_once',
  ProceedAlways = 'proceed_always',
  ProceedAlwaysPrefix = 'proceed_always_prefix',
  Cancel = 'cancel',
}

export type ToolCallConfirmationDetails =
  | ToolExecuteConfirmationDetails
  | ToolEditConfirmationDetails
  | ToolInfoConfirmationDetails;

export interface ToolExecuteConfirmationDetails {
  type: 'exec';
  title: string;
  command: string;
  description?: string;
  rootCommand?: string;
  onConfirm: (outcome: ToolConfirmationOutcome) => Promise<void>;
}

export interface ToolEditConfirmationDetails {
  type: 'edit';
  title: string;
  filePath: string;
  fileName: string;
  fileDiff: string;
  isModifying?: boolean;
  onConfirm: (outcome: ToolConfirmationOutcome) => Promise<void>;
}

export interface ToolInfoConfirmationDetails {
  type: 'info';
  title: string;
  prompt: string;
  urls?: string[];
  onConfirm: (outcome: ToolConfirmationOutcome) => Promise<void>;
}