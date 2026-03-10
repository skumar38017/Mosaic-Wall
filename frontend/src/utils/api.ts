export interface ApiConfig {
  baseUrl: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(config: ApiConfig) {
    this.baseUrl = config.baseUrl;
  }

  getWebSocketUrl(): string {
    return this.baseUrl.replace('http', 'ws') + '/ws';
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
