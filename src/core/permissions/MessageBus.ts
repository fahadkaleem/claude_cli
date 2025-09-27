import { EventEmitter } from 'node:events';
import type { PolicyEngine } from '../policy/PolicyEngine.js';
import { PolicyDecision } from '../policy/types.js';
import { MessageBusType, type Message } from './types.js';

export class MessageBus extends EventEmitter {
  constructor(private readonly policyEngine: PolicyEngine) {
    super();
  }

  private isValidMessage(message: Message): boolean {
    if (!message || !message.type) {
      return false;
    }

    if (
      message.type === MessageBusType.TOOL_CONFIRMATION_REQUEST &&
      !('correlationId' in message)
    ) {
      return false;
    }

    return true;
  }

  private emitMessage(message: Message): void {
    this.emit(message.type, message);
  }

  publish(message: Message): void {
    try {
      if (!this.isValidMessage(message)) {
        throw new Error(
          `Invalid message structure: ${JSON.stringify(message)}`,
        );
      }

      if (message.type === MessageBusType.TOOL_CONFIRMATION_REQUEST) {
        const decision = this.policyEngine.check(message.toolCall);

        switch (decision) {
          case PolicyDecision.ALLOW:
            this.emitMessage({
              type: MessageBusType.TOOL_CONFIRMATION_RESPONSE,
              correlationId: message.correlationId,
              confirmed: true,
            });
            break;
          case PolicyDecision.DENY:
            this.emitMessage({
              type: MessageBusType.TOOL_POLICY_REJECTION,
              toolCall: message.toolCall,
            });
            this.emitMessage({
              type: MessageBusType.TOOL_CONFIRMATION_RESPONSE,
              correlationId: message.correlationId,
              confirmed: false,
            });
            break;
          case PolicyDecision.ASK_USER:
            this.emitMessage(message);
            break;
          default:
            throw new Error(`Unknown policy decision: ${decision}`);
        }
      } else {
        this.emitMessage(message);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  subscribe<T extends Message>(
    type: T['type'],
    listener: (message: T) => void,
  ): void {
    this.on(type, listener);
  }

  unsubscribe<T extends Message>(
    type: T['type'],
    listener: (message: T) => void,
  ): void {
    this.off(type, listener);
  }
}