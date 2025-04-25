declare module 'fbemitter' {
  export class EventEmitter {
    static defaultMaxListeners: number;
    addListener(eventType: string, listener: Function, context?: any): EmitterSubscription;
    emit(eventType: string, ...args: any[]): void;
    removeAllListeners(eventType?: string): void;
    listeners(eventType: string): Function[];
    once(eventType: string, listener: Function, context?: any): EmitterSubscription;
  }

  export class EmitterSubscription {
    remove(): void;
  }
} 