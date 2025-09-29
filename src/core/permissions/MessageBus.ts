import { EventEmitter } from 'node:events';
import { MessageBusType, type Message } from './types.js';

export class MessageBus extends EventEmitter {
  constructor() {
    super();
  }

  publish(message: Message): void {
    this.emit(message.type, message);
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