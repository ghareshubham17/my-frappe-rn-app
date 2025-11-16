import { useAuth } from '../contexts/AuthContext';
import { useState, useCallback } from 'react';

export const useFrappeService = () => {
  const { isAuthenticated, siteUrl } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const withErrorHandling = async (operation) => {
    if (!isAuthenticated) {
      throw new Error('User not authenticated');
    }

    if (!siteUrl) {
      throw new Error('Site URL not configured');
    }

    try {
      setLoading(true);
      setError(null);
      const result = await operation();
      return result;
    } catch (error) {
      console.error('Frappe API Error:', error);
      setError(error.message || 'An error occurred');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getList = useCallback(async (doctype, options = {}) => {
    return withErrorHandling(async () => {
      const params = new URLSearchParams();
      
      if (options.fields) {
        const fields = Array.isArray(options.fields) ? options.fields : [options.fields];
        params.append('fields', JSON.stringify(fields));
      }
      
      if (options.filters && Object.keys(options.filters).length > 0) {
        params.append('filters', JSON.stringify(options.filters));
      }
      
      if (options.order_by) {
        params.append('order_by', options.order_by);
      }
      
      if (options.limit) {
        params.append('limit_page_length', options.limit.toString());
      }

      const url = `${siteUrl}/api/resource/${doctype}?${params.toString()}`;
      console.log('Direct API URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      return data.data || data;
    });
  }, [isAuthenticated, siteUrl]);

  const getDoc = useCallback(async (doctype, name) => {
    return withErrorHandling(async () => {
      const url = `${siteUrl}/api/resource/${doctype}/${encodeURIComponent(name)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      return data.data || data;
    });
  }, [isAuthenticated, siteUrl]);

  const createDoc = useCallback(async (doctype, doc) => {
    return withErrorHandling(async () => {
      const url = `${siteUrl}/api/resource/${doctype}`;
      console.log('Creating document via direct API:', url, doc);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(doc),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      return data.data || data;
    });
  }, [isAuthenticated, siteUrl]);

  const updateDoc = useCallback(async (doctype, name, doc) => {
    return withErrorHandling(async () => {
      const url = `${siteUrl}/api/resource/${doctype}/${encodeURIComponent(name)}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(doc),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      return data.data || data;
    });
  }, [isAuthenticated, siteUrl]);

  const deleteDoc = useCallback(async (doctype, name) => {
    return withErrorHandling(async () => {
      const url = `${siteUrl}/api/resource/${doctype}/${encodeURIComponent(name)}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      return { message: 'Document deleted successfully' };
    });
  }, [isAuthenticated, siteUrl]);

  const call = useCallback(async (method, params = {}) => {
    return withErrorHandling(async () => {
      const url = `${siteUrl}/api/method/${method}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      return data.message || data;
    });
  }, [isAuthenticated, siteUrl]);

  const callGet = useCallback(async (method, params = {}) => {
    return withErrorHandling(async () => {
      const queryParams = new URLSearchParams(params).toString();
      const url = `${siteUrl}/api/method/${method}${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      return data.message || data;
    });
  }, [isAuthenticated, siteUrl]);

  // Utility methods using direct API calls
  const getCount = useCallback(async (doctype, filters = {}) => {
    return withErrorHandling(async () => {
      return await call('frappe.client.get_count', {
        doctype,
        filters
      });
    });
  }, [call]);

  const getMeta = useCallback(async (doctype) => {
    return withErrorHandling(async () => {
      return await call('frappe.desk.form.meta.get_meta', {
        doctype
      });
    });
  }, [call]);

  return {
    // Core CRUD operations
    getList,
    getDoc,
    createDoc,
    updateDoc,
    deleteDoc,
    
    // API calls
    call,
    callGet,
    
    // Utility methods
    getCount,
    getMeta,
    
    // State
    loading,
    error,
    
    // Clear error method
    clearError: () => setError(null)
  };
};