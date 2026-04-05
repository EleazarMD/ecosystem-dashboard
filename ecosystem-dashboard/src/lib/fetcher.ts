/**
 * Data Fetcher Utility
 * 
 * Provides a standardized way to fetch data from API endpoints.
 * Used with SWR for data fetching and caching.
 */

/**
 * Fetch data from an API endpoint
 * 
 * @param url - The URL to fetch data from
 * @returns The fetched data
 * @throws Error if the fetch fails
 */
export const fetcher = async (url: string) => {
  const response = await fetch(url);
  
  // Check if the response is OK
  if (!response.ok) {
    // Try to parse the error response
    try {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || 
        errorData.message || 
        `API error: ${response.status} ${response.statusText}`
      );
    } catch (e) {
      // If parsing fails, throw a generic error
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  }
  
  return response.json();
};

/**
 * Post data to an API endpoint
 * 
 * @param url - The URL to post data to
 * @param data - The data to post
 * @returns The response data
 * @throws Error if the post fails
 */
export const poster = async (url: string, data: any) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  // Check if the response is OK
  if (!response.ok) {
    // Try to parse the error response
    try {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || 
        errorData.message || 
        `API error: ${response.status} ${response.statusText}`
      );
    } catch (e) {
      // If parsing fails, throw a generic error
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  }
  
  return response.json();
};
