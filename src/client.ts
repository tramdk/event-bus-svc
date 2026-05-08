import axios from 'axios';

export interface EventPayload {
  reelId: string;
  [key: string]: any;
}

export type EventType = 
  | 'REEL_REQUESTED' 
  | 'REEL_PROCESSING' 
  | 'REEL_PROGRESS' 
  | 'REEL_COMPLETED' 
  | 'REEL_FAILED' 
  | 'REEL_PUBLISHED';

export class EventBusClient {
  private baseUrl: string;
  private stream: string = 'reels_stream';

  constructor(baseUrl: string = 'http://localhost:4000') {
    this.baseUrl = baseUrl;
  }

  async publish(event: EventType, payload: EventPayload) {
    try {
      const response = await axios.post(`${this.baseUrl}/publish`, {
        stream: this.stream,
        event,
        payload
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to publish event ${event}:`, error);
      throw error;
    }
  }
}

// Example usage:
// const eb = new EventBusClient();
// await eb.publish('REEL_REQUESTED', { reelId: '123', title: 'Hello' });
