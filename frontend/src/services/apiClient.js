/**
 * Custom API Client for CinePulse Backend
 * Normalizes HTTP requests, headers, and standard envelope unpacking.
 */

const BASE_API_URL = import.meta.env.VITE_API_URL || '/api/watchlist';

/**
 * Custom application error container preserving HTTP status code and server payload.
 */
export class WatchlistApiError extends Error {
  constructor(message, statusCode, serverPayload = null) {
    super(message);
    this.name = 'WatchlistApiError';
    this.statusCode = statusCode;
    this.serverPayload = serverPayload;
  }
}

/**
 * Internal executor wrapping fetch with envelope parsing
 * @param {string} endpointPath - Path relative to base API
 * @param {RequestInit} [fetchOptions={}] - Fetch configuration options
 * @returns {Promise<any>}
 */
async function invokeApi(endpointPath, fetchOptions = {}) {
  const finalUrl = `${BASE_API_URL}${endpointPath}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(fetchOptions.headers || {})
  };

  const response = await fetch(finalUrl, {
    ...fetchOptions,
    headers: defaultHeaders
  });

  let parsedPayload;
  try {
    parsedPayload = await response.json();
  } catch (jsonErr) {
    parsedPayload = { success: false, message: 'Non-JSON server response', data: null };
  }

  if (!response.ok || (parsedPayload && parsedPayload.success === false)) {
    const errorMsg = parsedPayload?.message || `Request failed with status code ${response.status}`;
    throw new WatchlistApiError(errorMsg, response.status, parsedPayload);
  }

  return parsedPayload.data;
}

/**
 * API Service Surface
 */
export const watchlistApiService = {
  /**
   * Fetches paginated & filtered watchlist catalog
   * @param {{ status?: string, genre?: string, search?: string, page?: number }} filters
   */
  async getCatalog(filters = {}) {
    const queryParams = new URLSearchParams();
    if (filters.status && filters.status !== 'All') queryParams.append('status', filters.status);
    if (filters.genre && filters.genre !== 'All') queryParams.append('genre', filters.genre);
    if (filters.search && filters.search.trim()) queryParams.append('search', filters.search.trim());
    if (filters.page) queryParams.append('page', String(filters.page));

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return invokeApi(queryString, { method: 'GET' });
  },

  /**
   * Submits a new movie entry
   * @param {Object} movieData
   */
  async createItem(movieData) {
    return invokeApi('', {
      method: 'POST',
      body: JSON.stringify(movieData)
    });
  },

  /**
   * Updates permitted details of an existing item
   * @param {string} itemId
   * @param {Object} updateData
   */
  async updateItem(itemId, updateData) {
    return invokeApi(`/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  },

  /**
   * Transitions movie status adhering to FSM rules
   * @param {string} itemId
   * @param {string} targetStatus
   * @param {number|null} [rating=null]
   */
  async transitionStatus(itemId, targetStatus, rating = null) {
    const body = { status: targetStatus };
    if (targetStatus === 'Watched' && rating !== null) {
      body.rating = Number(rating);
    }
    return invokeApi(`/${itemId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  },

  /**
   * Updates rating for an item already marked as 'Watched'
   * @param {string} itemId
   * @param {number} rating
   */
  async updateRating(itemId, rating) {
    return invokeApi(`/${itemId}/rating`, {
      method: 'PATCH',
      body: JSON.stringify({ rating: Number(rating) })
    });
  },

  /**
   * Deletes a movie entry (enforces status !== 'Watching')
   * @param {string} itemId
   */
  async deleteItem(itemId) {
    return invokeApi(`/${itemId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Retrieves intelligent "Watch Next" recommendation
   */
  async getRecommendation() {
    return invokeApi('/recommend-next', { method: 'GET' });
  },

  /**
   * Computes aggregation analytics
   */
  async getAnalytics() {
    return invokeApi('/analytics', { method: 'GET' });
  }
};
