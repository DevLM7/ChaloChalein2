const API_BASE_URL = 'http://localhost:5000/api';

const defaultHeaders = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};

const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.error || errorData.message || errorMessage;
    }
    throw new Error(errorMessage);
  }
  
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

export const getWeather = async (city) => {
  try {
    const url = new URL(`${API_BASE_URL}/weather`);
    url.searchParams.append('city', city);
    
    console.log('Fetching weather from:', url.toString());
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: defaultHeaders
    });
    
    const data = await handleResponse(response);
    console.log('Weather API Response:', data);
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return {
      location: data.location,
      temperature: data.temperature,
      description: data.description,
      icon: data.icon
    };
  } catch (error) {
    console.error('Weather API Error:', error);
    throw new Error(`Failed to fetch weather data: ${error.message}`);
  }
};

export const searchLocations = async (query) => {
  try {
    const url = new URL(`${API_BASE_URL}/locations/search`);
    url.searchParams.append('query', query);
    
    console.log('Searching locations from:', url.toString());
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: defaultHeaders
    });
    
    const data = await handleResponse(response);
    console.log('Location Search API Response:', data);
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to search locations');
    }
    
    return data;
  } catch (error) {
    console.error('Location Search API Error:', error);
    throw new Error(`Failed to search locations: ${error.message}`);
  }
};

import { decodePolyline } from './polylineDecoder';

export const getRoute = async (origin, destination) => {
  try {
    // Format coordinates properly
    const originStr = typeof origin === 'object' ? `${origin.lat},${origin.lng}` : origin;
    const destStr = typeof destination === 'object' ? `${destination.lat},${destination.lng}` : destination;
    
    const url = new URL(`${API_BASE_URL}/route`);
    url.searchParams.append('origin', originStr);
    url.searchParams.append('destination', destStr);
    
    console.log('Fetching route from:', url.toString());
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: defaultHeaders
    });
    
    const data = await handleResponse(response);
    console.log('Route API Response:', data);
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to find route');
    }
    
    // Decode polyline string to array of coordinates
    const decodedPolyline = decodePolyline(data.polyline);
    
    return {
      ...data,
      polyline: decodedPolyline
    };
  } catch (error) {
    console.error('Routing API Error:', error);
    throw new Error(`Failed to calculate route: ${error.message}`);
  }
};

export const getGroqResponse = async (messages) => {
  try {
    const url = `${API_BASE_URL}/groq`;
    const requestBody = {
      messages: messages
    };
    
    console.log('Sending request to backend GROQ endpoint:', url);
    console.log('Request body:', requestBody);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await handleResponse(response);
    console.log('Backend GROQ API Response:', data);
    
    if (!data.success || !data.content) {
      throw new Error(data.error || 'No response received from chatbot');
    }
    
    return data.content;
  } catch (error) {
    console.error('Backend GROQ API Error:', error);
    throw new Error(`Failed to get AI response: ${error.message}`);
  }
};

export const checkApiHealth = async () => {
  try {
    const url = `${API_BASE_URL}/health`;
    console.log('Checking API health at:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: defaultHeaders
    });
    
    const data = await handleResponse(response);
    console.log('Health Check Response:', data);
    return data.status === 'healthy';
  } catch (error) {
    console.error('Health Check Error:', error);
    return false;
  }
}; 