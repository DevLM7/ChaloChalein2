import os
import requests
from typing import Dict, List, Any, Optional
import json
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("api_helpers")

# Load environment variables from .env file if available
load_dotenv()

# Set API keys directly if not found in environment
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "d0a4f0e922e9455dae955912252804")
HERE_MAPS_API_KEY = os.getenv("HERE_MAPS_API_KEY", "OBPIKcttrjPlhI0QmzM3bMbsUaIs4fzWIzN8ZB4n-4w")
HERE_MAPS_APP_ID = os.getenv("HERE_MAPS_APP_ID", "26aBRNeYysMtOJuAmUpJ")

# Print API keys for debugging (remove in production)
logger.info(f"WeatherAPI Key: {WEATHER_API_KEY[:5]}...")
logger.info(f"HERE Maps API Key: {HERE_MAPS_API_KEY[:5]}...")
logger.info(f"GROQ API Key: {GROQ_API_KEY[:5]}...")

def get_weather_forecast(city: str) -> Dict[str, Any]:
    """
    Get weather forecast for a specific city using WeatherAPI.com
    
    Args:
        city: The city name to get weather for
        
    Returns:
        Dictionary containing weather data or error message
    """
    logger.info(f"Getting weather forecast for {city}")
    try:
        # Make API call to WeatherAPI.com - use HTTPS instead of HTTP
        url = "https://api.weatherapi.com/v1/current.json"
        params = {
            "key": WEATHER_API_KEY,
            "q": city,
            "aqi": "no"
        }
        
        logger.info(f"Making request to {url} with params: {params}")
        response = requests.get(url, params=params)
        
        # Check if request was successful
        status_code = response.status_code
        logger.info(f"Weather API response status code: {status_code}")
        
        if status_code != 200:
            logger.error(f"Weather API error: {response.text}")
            return {"error": f"Weather API returned status code {status_code}: {response.text}"}
            
        response.raise_for_status()
        data = response.json()
        
        # Process the weather data to a simplified format
        if "location" in data and "current" in data:
            location = data["location"]["name"]
            region = data["location"]["region"]
            country = data["location"]["country"]
            
            temperature = data["current"]["temp_c"]
            description = data["current"]["condition"]["text"]
            icon = data["current"]["condition"]["icon"]
            
            result = {
                "location": f"{location}, {region}, {country}",
                "temperature": temperature,
                "description": description,
                "icon": icon,
                "raw_data": data
            }
            logger.info(f"Weather data retrieved successfully for {city}")
            return result
        else:
            logger.error(f"Unexpected API response format: {data}")
            return {"error": "Unexpected API response format"}
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Weather API request failed: {str(e)}")
        return {"error": f"Weather API request failed: {str(e)}"}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON from Weather API: {str(e)}")
        return {"error": "Invalid response from Weather API"}
    except Exception as e:
        logger.error(f"Unexpected error in get_weather_forecast: {str(e)}")
        return {"error": f"An unexpected error occurred: {str(e)}"}

def get_location_search(query: str) -> Dict[str, Any]:
    """
    Search for locations using HERE Maps API
    
    Args:
        query: The search query for locations
        
    Returns:
        Dictionary containing location data or error message
    """
    logger.info(f"Searching for locations with query: {query}")
    try:
        # Make API call to HERE Maps Geocoding API
        url = "https://geocode.search.hereapi.com/v1/geocode"
        params = {
            "q": query,
            "apiKey": HERE_MAPS_API_KEY,
            "lang": "en-US"
        }
        
        logger.info(f"Making request to {url} with query: {query}")
        response = requests.get(url, params=params)
        
        # Check if request was successful
        status_code = response.status_code
        logger.info(f"HERE Maps API response status code: {status_code}")
        
        if status_code != 200:
            logger.error(f"HERE Maps API error: {response.text}")
            return {"success": False, "error": f"HERE Maps API returned status code {status_code}: {response.text}"}
            
        response.raise_for_status()
        data = response.json()
        
        if "items" in data:
            locations = []
            for item in data["items"]:
                locations.append({
                    "name": item.get("title", "Unknown location"),
                    "address": item.get("address", {}).get("label", "No address available"),
                    "position": {
                        "lat": item.get("position", {}).get("lat"),
                        "lng": item.get("position", {}).get("lng")
                    },
                    "types": item.get("resultType", "unknown")
                })
            
            logger.info(f"Found {len(locations)} locations for query: {query}")
            return {
                "success": True,
                "locations": locations,
                "raw_data": data
            }
        else:
            logger.warning(f"No locations found for query: {query}")
            return {"success": False, "error": "No locations found"}
    
    except requests.exceptions.RequestException as e:
        logger.error(f"HERE Maps API request failed: {str(e)}")
        return {"success": False, "error": f"HERE Maps API request failed: {str(e)}"}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON from HERE Maps API: {str(e)}")
        return {"success": False, "error": "Invalid response from HERE Maps API"}
    except Exception as e:
        logger.error(f"Unexpected error in get_location_search: {str(e)}")
        return {"success": False, "error": f"An unexpected error occurred: {str(e)}"}

def get_route(origin: str, destination: str) -> Dict[str, Any]:
    """
    Get route between two locations using HERE Maps API
    
    Args:
        origin: Starting location (address or coordinates)
        destination: Ending location (address or coordinates)
        
    Returns:
        Dictionary containing route data or error message
    """
    logger.info(f"Getting route from {origin} to {destination}")
    try:
        # Make API call to HERE Maps Routing API
        url = "https://router.hereapi.com/v8/routes"
        params = {
            "transportMode": "car",
            "origin": origin,
            "destination": destination,
            "return": "summary,polyline",
            "apiKey": HERE_MAPS_API_KEY
        }
        
        logger.info(f"Making request to {url}")
        response = requests.get(url, params=params)
        
        # Check if request was successful
        status_code = response.status_code
        logger.info(f"HERE Maps Routing API response status code: {status_code}")
        
        if status_code != 200:
            logger.error(f"HERE Maps Routing API error: {response.text}")
            return {"success": False, "error": f"HERE Maps Routing API returned status code {status_code}: {response.text}"}
            
        response.raise_for_status()
        data = response.json()
        
        if "routes" in data and len(data["routes"]) > 0:
            route = data["routes"][0]
            sections = route.get("sections", [])
            
            if len(sections) > 0:
                summary = sections[0].get("summary", {})
                logger.info(f"Route found: {summary.get('length', 0)}m, {summary.get('duration', 0)}s")
                return {
                    "success": True,
                    "distance": summary.get("length", 0),  # in meters
                    "duration": summary.get("duration", 0),  # in seconds
                    "polyline": sections[0].get("polyline", ""),
                    "raw_data": data
                }
        
        logger.warning(f"No route found between {origin} and {destination}")
        return {"success": False, "error": "No route found"}
    
    except requests.exceptions.RequestException as e:
        logger.error(f"HERE Maps Routing API request failed: {str(e)}")
        return {"success": False, "error": f"HERE Maps API request failed: {str(e)}"}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON from HERE Maps Routing API: {str(e)}")
        return {"success": False, "error": "Invalid response from HERE Maps API"}
    except Exception as e:
        logger.error(f"Unexpected error in get_route: {str(e)}")
        return {"success": False, "error": f"An unexpected error occurred: {str(e)}"}

def get_groq_response(messages: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Get response from GROQ LLM API
    
    Args:
        messages: List of message dictionaries with role and content
        
    Returns:
        Dictionary with success status and content or error message
    """
    logger.info(f"Getting GROQ response for {len(messages)} messages")
    
    # Use the new API key
    groq_api_key = "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"
    
    try:
        # Make API call to GROQ
        url = "https://api.groq.com/openai/v1/chat/completions"
        json_data = {
            "model": "meta-llama/llama-4-scout-17b-16e-instruct",
            "messages": messages,
            "max_tokens": 1000,
            "temperature": 0.7
        }
        headers = {
            "Authorization": f"Bearer {groq_api_key}",
            "Content-Type": "application/json"
        }
        
        logger.info(f"Making request to {url}")
        response = requests.post(url, json=json_data, headers=headers)
        
        # Check if request was successful
        status_code = response.status_code
        logger.info(f"GROQ API response status code: {status_code}")
        
        if status_code != 200:
            logger.error(f"GROQ API error: {response.text}")
            return {"success": False, "error": f"GROQ API returned status code {status_code}: {response.text}"}
            
        response.raise_for_status()
        data = response.json()
        
        if "choices" in data and len(data["choices"]) > 0:
            content = data["choices"][0]["message"]["content"]
            logger.info("GROQ response received successfully")
            # Always return the raw content string - let the frontend handle any JSON parsing
            return {"success": True, "content": content}
        else:
            logger.error(f"No content received from GROQ API: {data}")
            return {"success": False, "error": "No response content received from GROQ API"}
    
    except requests.exceptions.RequestException as e:
        logger.error(f"GROQ API request failed: {str(e)}")
        return {"success": False, "error": f"GROQ API request failed: {str(e)}"}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON from GROQ API: {str(e)}")
        return {"success": False, "error": "Invalid response from GROQ API"}
    except Exception as e:
        logger.error(f"Unexpected error in get_groq_response: {str(e)}")
        return {"success": False, "error": f"An unexpected error occurred: {str(e)}"}
