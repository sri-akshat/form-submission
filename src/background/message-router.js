export class MessageRouter {
  constructor() {
    this.handlers = new Map();
  }

  register(type, handler) {
    this.handlers.set(type, handler);
  }

  async dispatch(message, context = {}) {
    if (!message?.type) {
      throw new Error('Invalid message: missing type');
    }

    const handler = this.handlers.get(message.type);
    if (!handler) {
      throw new Error(`No handler registered for message type: ${message.type}`);
    }

    return handler(message.payload ?? {}, context);
  }
}
