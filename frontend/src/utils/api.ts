export interface ApiConfig {
  baseUrl: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(config: ApiConfig) {
    this.baseUrl = config.baseUrl;
  }

  async uploadPhoto(file: File | Blob): Promise<{ success: boolean; message?: string }> {
    const formData = new FormData();
    formData.append('file', file, 'photo.jpg'); 

    try {
      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorText = await response.text();
        return { success: false, message: errorText };
      }
    } catch (error) {
      console.error('Upload error:', error);
      return { success: false, message: 'Network error' };
    }
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