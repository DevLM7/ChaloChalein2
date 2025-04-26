from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from chatbot import TravelChatbot
from utils.api_helpers import get_weather_forecast

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HelpRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

@app.post("/api/chatbot/help")
async def get_help(request: HelpRequest):
    try:
        chatbot = TravelChatbot()
        response = chatbot.get_help_response(request.message, request.context)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/weather")
async def get_weather(city: str = Query(..., description="The city name to fetch weather for")):
    try:
        weather_data = get_weather_forecast(city)
        if "error" in weather_data:
            raise HTTPException(status_code=400, detail=weather_data["error"])
        return weather_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
