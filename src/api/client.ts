const MAX_RETRIES = 3;
const BASE_DELAY = 1000;
const API_BASE_URL = 'https://api.example.com'; // Replace with actual API URL

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchWithRetry<T>(
  endpoint: string,
  options?: RequestInit,
  retries: number = MAX_RETRIES
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const isLastAttempt = attempt === retries - 1;

      if (isLastAttempt) {
        throw error;
      }

      // Exponential backoff
      const delay = BASE_DELAY * Math.pow(2, attempt);
      console.log(`Retry ${attempt + 1}/${retries} after ${delay}ms`);
      await sleep(delay);
    }
  }

  throw new Error('Unexpected: retry loop completed without return');
}

export function setApiBaseUrl(url: string): void {
  // In a real app, this would update the base URL
  // For now, we'll use environment variables or config
  console.log('API base URL would be set to:', url);
}
