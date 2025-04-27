import React, { useState, useEffect, useCallback } from 'react';
import { 
  Steps, Form, DatePicker, Button, Card, Row, Col, 
  Input, Radio, Tag, Spin, message, Typography, Tabs, 
  List, Space, Avatar, Modal
} from 'antd';
import dayjs from 'dayjs';
import axios from 'axios';
import { 
  EnvironmentOutlined, CalendarOutlined, CarOutlined, 
  HeartOutlined, RocketOutlined, EditOutlined,
  PlusOutlined, CloudOutlined, CompassOutlined,
  MessageOutlined, SendOutlined, CustomerServiceOutlined
} from '@ant-design/icons';
import MapComponent from '../MapComponent';

// Foursquare API constants
const FOURSQUARE_API_URL = 'https://api.foursquare.com/v3';
const FOURSQUARE_API_KEY = process.env.REACT_APP_FOURSQUARE_API_KEY;

// Backend API constants
const BACKEND_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// GROQ API constants
const GROQ_API_URL = 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

// Destructure Typography components
const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { TabPane } = Tabs;

const TravelPlanner = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    destination: localStorage.getItem('selectedDestination') || '',
    startDate: dayjs(),
    endDate: dayjs().add(7, 'day'),
    transportation: 'flight',
    companions: 'solo',
    interests: [],
    notes: ''
  });
  
  // State for API responses
  const [weatherData, setWeatherData] = useState(null);
  const [locations, setLocations] = useState([]);
  const [itinerary, setItinerary] = useState(null);
  const [searchInitiated, setSearchInitiated] = useState(false);
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [helpMessages, setHelpMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [helpInput, setHelpInput] = useState('');

  // Calculate trip duration
  const duration = formData.endDate.diff(formData.startDate, 'day') + 1;

  // Interest options
  const interestOptions = [
    { label: 'History', value: 'history', icon: '🏛️' },
    { label: 'Art', value: 'art', icon: '🎨' },
    { label: 'Food', value: 'food', icon: '🍽️' },
    { label: 'Nature', value: 'nature', icon: '🌿' },
    { label: 'Adventure', value: 'adventure', icon: '🧗' },
    { label: 'Shopping', value: 'shopping', icon: '🛍️' },
    { label: 'Nightlife', value: 'nightlife', icon: '🌃' },
    { label: 'Relaxation', value: 'relaxation', icon: '🧘' },
    { label: 'Family', value: 'family', icon: '👨‍👩‍👧‍👦' },
    { label: 'Culture', value: 'culture', icon: '🎭' }
  ];
  
  // Transportation options
  const transportationOptions = [
    { label: 'Flight', value: 'flight', icon: '✈️' },
    { label: 'Train', value: 'train', icon: '🚆' },
    { label: 'Bus', value: 'bus', icon: '🚌' },
    { label: 'Car', value: 'car', icon: '🚗' }
  ];
  
  // Companion options
  const companionOptions = [
    { label: 'Solo', value: 'solo', icon: '🧍' },
    { label: 'Couple', value: 'couple', icon: '👫' },
    { label: 'Family', value: 'family', icon: '👨‍👩‍👧' },
    { label: 'Friends', value: 'friends', icon: '👥' }
  ];

  // Check for API keys
  const checkApiKeys = useCallback(() => {
    if (!GROQ_API_KEY) {
      message.error("GROQ API key not found. Please configure your API keys.");
      return false;
    }
    
    if (!FOURSQUARE_API_KEY) {
      message.error("Foursquare API key not found. Please configure your API keys.");
      return false;
    }
    
    return true;
  }, []);

  const fetchWeatherData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching weather for:', formData.destination);
      
      // Call backend API which handles the weather API call
      const response = await axios.get(`${BACKEND_API_URL}/api/weather`, {
        params: new URLSearchParams({
          city: formData.destination
        })
      });
      
      console.log('Backend response:', response.data);
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      // Process the weather data
      const processedData = {
        location: response.data.location,
        current: { 
          temp: response.data.temperature,
          conditions: response.data.description,
          icon: '' // We might want to add weather icon mapping in the backend
        },
        forecast: [] // WeatherAPI requires a different endpoint for forecasts
      };
      
      setWeatherData(processedData);
    } catch (error) {
      console.error('Error fetching weather:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      
      let errorMessage = 'Could not fetch weather data.';
      if (error.response) {
        errorMessage += ` Status: ${error.response.status}`;
        if (error.response.data?.detail) {
          errorMessage += ` Error: ${error.response.data.detail}`;
        }
      }
      
      message.error(errorMessage);
      
      // Fallback data
      setWeatherData({
        location: formData.destination,
        current: { 
          temp: 25, 
          conditions: 'Partly Cloudy',
          icon: 'partly-cloudy'
        },
        forecast: Array(7).fill().map((_, i) => ({
          day: dayjs().add(i + 1, 'day').format('ddd'),
          temp: Math.round(20 + Math.random() * 10),
          conditions: ['Sunny', 'Cloudy', 'Partly Cloudy', 'Rainy'][Math.floor(Math.random() * 4)]
        }))
      });
    } finally {
      setLoading(false);
    }
  }, [formData.destination, setLoading]);

  // Fetch location suggestions
  const fetchLocationSuggestions = useCallback(async () => {
    if (!checkApiKeys()) return; // Check API key before proceeding
    
    try {
      setLoading(true);
      
      // Direct API call to Foursquare
      const response = await axios.get(`${FOURSQUARE_API_URL}/places/search`, {
        params: {
          query: formData.destination,
          limit: 10
        },
        headers: {
          'Authorization': FOURSQUARE_API_KEY
        }
      });
      
      // Process the locations data
      const processedLocations = response.data.results.map(place => ({
        id: place.fsq_id,
        name: place.name,
        address: place.location.address || 'No address available',
        category: place.categories[0]?.name || 'Attraction',
        position: [place.geocodes.main.latitude, place.geocodes.main.longitude],
        rating: place.rating || 4.0,
        photo: place.photos?.[0]?.prefix + 'original' + place.photos?.[0]?.suffix || 'https://via.placeholder.com/150'
      }));
      
      setLocations(processedLocations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      message.error('Could not fetch location suggestions');
      
      // Fallback data
      setLocations([
        {
          id: 'place1',
          name: 'Popular Attraction 1',
          address: formData.destination,
          category: 'Attraction',
          position: [51.505, -0.09],
          rating: 4.5,
          photo: 'https://via.placeholder.com/150'
        },
        {
          id: 'place2',
          name: 'Popular Restaurant',
          address: formData.destination,
          category: 'Restaurant',
          position: [51.51, -0.1],
          rating: 4.2,
          photo: 'https://via.placeholder.com/150'
        },
        {
          id: 'place3',
          name: 'Popular Hotel',
          address: formData.destination,
          category: 'Hotel',
          position: [51.515, -0.08],
          rating: 4.7,
          photo: 'https://via.placeholder.com/150'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [formData.destination, checkApiKeys]);

  // Generate itinerary
  const generateItinerary = useCallback(async () => {
    if (!checkApiKeys()) return; // Check API key before proceeding
    
    try {
      setLoading(true);
      
      // Direct API call to GROQ
      const response = await axios.post(`${GROQ_API_URL}/chat/completions`, {
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: "You are a travel planning assistant. Create a detailed day-by-day itinerary based on the user's preferences."
          },
          {
            role: "user",
            content: `Create a detailed ${duration}-day itinerary for ${formData.destination}. 
            Travel dates: ${formData.startDate.format('YYYY-MM-DD')} to ${formData.endDate.format('YYYY-MM-DD')}.
            Transportation: ${formData.transportation}.
            Traveling as: ${formData.companions}.
            Interests: ${formData.interests.join(', ')}.
            Additional notes: ${formData.notes || 'None'}.
            
            Format the response as a JSON object with the following structure:
            {
              "destination": "City name",
              "days": [
                {
                  "day": 1,
                  "date": "YYYY-MM-DD",
                  "activities": [
                    {
                      "time": "09:00",
                      "activity": "Visit attraction",
                      "description": "Short description",
                      "category": "sightseeing/food/shopping/etc",
                      "location": {
                        "name": "Name of place",
                        "address": "Address",
                        "coordinates": [latitude, longitude]
                      }
                    }
                  ]
                }
              ]
            }`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }, {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Process the itinerary data
      let itineraryData;
      try {
        const content = response.data.choices[0].message.content;
        // Extract JSON from the response if needed
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
        itineraryData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Error parsing itinerary JSON:', parseError);
        throw new Error('Could not parse itinerary data');
      }
      
      setItinerary(itineraryData);
      setCurrentStep(4); // Move to itinerary step
      message.success('Your personalized itinerary is ready!');
    } catch (error) {
      console.error('Error generating itinerary:', error);
      message.error('Could not generate itinerary');
      
      // Fallback itinerary
      const fallbackItinerary = {
        destination: formData.destination,
        days: Array(duration).fill().map((_, i) => ({
          day: i + 1,
          date: formData.startDate.add(i, 'day').format('YYYY-MM-DD'),
          activities: [
            {
              time: '09:00',
              activity: 'Breakfast at local cafe',
              description: 'Start your day with a delicious breakfast',
              category: 'food',
              location: {
                name: 'Local Cafe',
                address: formData.destination,
                coordinates: [51.505, -0.09]
              }
            },
            {
              time: '11:00',
              activity: 'Visit main attraction',
              description: 'Explore the most popular attraction',
              category: 'sightseeing',
              location: {
                name: 'Main Attraction',
                address: formData.destination,
                coordinates: [51.51, -0.1]
              }
            },
            {
              time: '13:30',
              activity: 'Lunch at recommended restaurant',
              description: 'Enjoy local cuisine',
              category: 'food',
              location: {
                name: 'Popular Restaurant',
                address: formData.destination,
                coordinates: [51.515, -0.08]
              }
            },
            {
              time: '15:00',
              activity: 'Afternoon activity',
              description: 'Relax and enjoy the local atmosphere',
              category: formData.interests[0] || 'relaxation',
              location: {
                name: 'Local Spot',
                address: formData.destination,
                coordinates: [51.52, -0.11]
              }
            },
            {
              time: '19:00',
              activity: 'Dinner and evening entertainment',
              description: 'End your day with a nice dinner',
              category: 'food',
              location: {
                name: 'Evening Venue',
                address: formData.destination,
                coordinates: [51.525, -0.09]
              }
            }
          ]
        }))
      };
      
      setItinerary(fallbackItinerary);
      setCurrentStep(4); // Still move to itinerary step with fallback data
    } finally {
      setLoading(false);
    }
  }, [formData.destination, formData.startDate, formData.endDate, formData.interests, formData.transportation, formData.companions, formData.notes, duration, checkApiKeys]);

  // Effect to fetch weather and locations when search is initiated
  useEffect(() => {
    if (searchInitiated && formData.destination) {
      fetchWeatherData();
      fetchLocationSuggestions();
      setSearchInitiated(false);
    }
  }, [searchInitiated, formData.destination, fetchWeatherData, fetchLocationSuggestions]);

  // Handle form data changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle next step
  const handleNext = () => {
    if (currentStep === 3) {
      generateItinerary();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  // Handle previous step
  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Handle search button click
  const handleSearch = () => {
    if (formData.destination) {
      setSearchInitiated(true);
    }
  };

  // Check if current step is valid
  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return !!formData.destination;
      case 1:
        return formData.startDate && formData.endDate;
      case 2:
        return !!formData.transportation;
      case 3:
        return formData.interests.length > 0;
      default:
        return true;
    }
  };

  // Chat message handler
  const handleHelpMessage = async (messageOrEvent) => {
    // Check if no message content or if input is empty
    if (!helpInput.trim() && typeof messageOrEvent !== 'string') {
      return;
    }
    
    // Get message content (either from parameter or from input state)
    const messageContent = typeof messageOrEvent === 'string' ? messageOrEvent : helpInput;
    
    const newMessage = { role: 'user', content: messageContent };
    setHelpMessages(prev => [...prev, newMessage]);
    setIsProcessing(true);

    try {
      // Prepare the context for the LLM
      const context = {
        destination: formData.destination,
        startDate: formData.startDate ? formData.startDate.format('YYYY-MM-DD') : null,
        endDate: formData.endDate ? formData.endDate.format('YYYY-MM-DD') : null,
        interests: formData.interests,
        companions: formData.companions,
        transportation: formData.transportation
      };

      // Call GROQ API directly
      const response = await axios.post(`${GROQ_API_URL}/chat/completions`, {
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: `You are a helpful travel assistant for ChaloChalein. 
            The user is planning a trip with the following details:
            - Destination: ${context.destination || 'Not specified'}
            - Travel Dates: ${context.startDate || 'Not specified'} to ${context.endDate || 'Not specified'}
            - Interests: ${context.interests?.join(', ') || 'Not specified'}
            - Traveling with: ${context.companions || 'Not specified'}
            - Transportation: ${context.transportation || 'Not specified'}

            Provide a detailed, personalized response to the user's query. 
            Use the context to make your response more relevant and helpful.
            Be conversational but professional.
            Include specific recommendations and tips when relevant.
            If the user asks about a specific destination, provide detailed information about that place.
            If the user asks about timing or seasons, consider the destination's climate and peak seasons.
            If the user asks about activities, suggest things that match their interests.
            Always be helpful and encouraging.`
          },
          {
            role: "user",
            content: messageContent
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }, {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      // Get the response from GROQ
      const finalResponse = response.data.choices[0].message.content;

      // Add a small delay for a more natural feel
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setHelpMessages(prev => [...prev, { role: 'assistant', content: finalResponse }]);
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'An unexpected error occurred';
      setHelpMessages(prev => [...prev, {
        role: 'assistant',
        content: `I'm having trouble processing your request: ${errorMessage}. Please try again later.`
      }]);
    } finally {
      setIsProcessing(false);
      setHelpInput('');
    }
  };

  // Render destination step
  const renderDestinationStep = () => (
    <div className="step-content">
      <Title level={4}>Where would you like to go?</Title>
      <Paragraph>Enter your destination to start planning your perfect trip.</Paragraph>
      
      <Form layout="vertical">
        <Form.Item 
          label="Destination" 
          required
          validateStatus={formData.destination ? 'success' : 'error'}
          help={!formData.destination && 'Please enter a destination'}
        >
          <Input.Search
            size="large"
            placeholder="e.g., Paris, Tokyo, New York"
            prefix={<EnvironmentOutlined />}
            value={formData.destination}
            onChange={e => handleInputChange('destination', e.target.value)}
            onSearch={handleSearch}
            enterButton="Search"
            loading={loading}
          />
        </Form.Item>
        
        <div className="popular-destinations">
          <Text type="secondary">Popular destinations:</Text>
          <div className="tag-container">
            {['Paris', 'Bali', 'Tokyo', 'New York', 'Rome'].map(city => (
              <Tag
                key={city}
                color="blue"
                style={{ cursor: 'pointer', margin: '4px' }}
                onClick={() => {
                  handleInputChange('destination', city);
                  setSearchInitiated(true);
                }}
              >
                {city}
              </Tag>
            ))}
          </div>
        </div>
      </Form>
    </div>
  );

  // Render dates step
  const renderDatesStep = () => (
    <div className="step-content">
      <Title level={4}>When are you planning to visit {formData.destination}?</Title>
      <Paragraph>Select your travel dates to help us create the perfect itinerary.</Paragraph>
      
      <Form layout="vertical">
        <Form.Item 
          label="Travel Dates" 
          required
        >
          <DatePicker.RangePicker
            size="large"
            format="YYYY-MM-DD"
            value={[formData.startDate, formData.endDate]}
            onChange={(dates) => {
              if (dates) {
                handleInputChange('startDate', dates[0]);
                handleInputChange('endDate', dates[1]);
              }
            }}
            style={{ width: '100%' }}
          />
        </Form.Item>
        
        <div className="trip-summary">
          <Card size="small">
            <Text>Trip duration: <strong>{duration} days</strong></Text>
          </Card>
        </div>
      </Form>
    </div>
  );

  // Render transportation step
  const renderTransportationStep = () => (
    <div className="step-content">
      <Title level={4}>How will you be traveling?</Title>
      <Paragraph>Select your preferred mode of transportation.</Paragraph>
      
      <Form layout="vertical">
        <Form.Item label="Transportation">
          <Radio.Group 
            value={formData.transportation}
            onChange={e => handleInputChange('transportation', e.target.value)}
            size="large"
          >
            <Space direction="vertical">
              {transportationOptions.map(option => (
                <Radio.Button value={option.value} key={option.value}>
                  <Space>
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </Space>
                </Radio.Button>
              ))}
            </Space>
          </Radio.Group>
        </Form.Item>
        
        <Form.Item label="Who are you traveling with?">
          <Radio.Group 
            value={formData.companions}
            onChange={e => handleInputChange('companions', e.target.value)}
            size="large"
          >
            <Space direction="vertical">
              {companionOptions.map(option => (
                <Radio.Button value={option.value} key={option.value}>
                  <Space>
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </Space>
                </Radio.Button>
              ))}
            </Space>
          </Radio.Group>
        </Form.Item>
      </Form>
    </div>
  );

  // Render interests step
  const renderInterestsStep = () => (
    <div className="step-content">
      <Title level={4}>What are your interests?</Title>
      <Paragraph>Select activities and experiences you'd like to include in your trip.</Paragraph>
      
      <Form layout="vertical">
        <Form.Item 
          label="Interests" 
          required
          validateStatus={formData.interests.length > 0 ? 'success' : 'error'}
          help={formData.interests.length === 0 && 'Please select at least one interest'}
        >
          <div className="interest-tags">
            {interestOptions.map(option => {
              const isSelected = formData.interests.includes(option.value);
              return (
                <Tag
                  key={option.value}
                  color={isSelected ? 'blue' : 'default'}
                  style={{ 
                    cursor: 'pointer', 
                    margin: '8px', 
                    padding: '8px 12px',
                    fontSize: '16px'
                  }}
                  onClick={() => {
                    const newInterests = isSelected
                      ? formData.interests.filter(i => i !== option.value)
                      : [...formData.interests, option.value];
                    handleInputChange('interests', newInterests);
                  }}
                >
                  <Space>
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </Space>
                </Tag>
              );
            })}
          </div>
        </Form.Item>
        
        <Form.Item label="Additional Notes (Optional)">
          <Input.TextArea
            placeholder="Any specific preferences or requirements for your trip?"
            value={formData.notes}
            onChange={e => handleInputChange('notes', e.target.value)}
            rows={4}
          />
        </Form.Item>
      </Form>
    </div>
  );

  // Render itinerary step
  const renderItineraryStep = () => (
    <div className="step-content">
      <Title level={4}>Your Personalized Itinerary for {formData.destination}</Title>
      <Paragraph>Here's your day-by-day plan based on your preferences.</Paragraph>
      
      {itinerary ? (
        <div className="itinerary-container">
          <Tabs defaultActiveKey="0" tabPosition="left">
            {itinerary.days.map((day, index) => (
              <TabPane 
                tab={`Day ${day.day}: ${new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`} 
                key={index}
              >
                <Card 
                  title={`Day ${day.day}: ${new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
                  extra={<Button icon={<EditOutlined />} size="small">Edit</Button>}
                >
                  <List
                    itemLayout="horizontal"
                    dataSource={day.activities}
                    renderItem={(activity, actIndex) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <Avatar className={`time-badge time-${getTimePeriod(activity.time)}`}>
                              {activity.time.split(':')[0]}
                            </Avatar>
                          }
                          title={
                            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                              {activity.description}
                            </div>
                          }
                          description={
                            <Space direction="vertical" size="small">
                              <div>
                                <EnvironmentOutlined style={{ marginRight: '5px' }} />
                                <Text>{activity.location.name}</Text>
                              </div>
                              <div className="activity-tags">
                                {getActivityTags(activity.description).map(tag => (
                                  <Tag color="blue" key={tag}>{tag}</Tag>
                                ))}
                              </div>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </TabPane>
            ))}
          </Tabs>
          
          <div className="itinerary-actions" style={{ marginTop: '24px' }}>
            <Space>
              <Button type="primary" className="save-itinerary" onClick={() => saveItinerary()}>Save Itinerary</Button>
              <Button icon={<PlusOutlined />} className="add-activity">Add Activity</Button>
              <Button onClick={() => shareItinerary()} className="share-button">Share</Button>
              <Button onClick={() => printItinerary()} className="print-button">Print</Button>
            </Space>
          </div>
        </div>
      ) : (
        <div className="loading-container" style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            Generating your personalized itinerary...
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to get time period for badge classes
  const getTimePeriod = (time) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 12) return 'morning';
    if (hour < 15) return 'lunch';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  // Helper function to get color based on time of day
  const getActivityColor = (time) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 12) return '#1890ff'; // Morning - blue
    if (hour < 15) return '#52c41a'; // Lunch - green
    if (hour < 18) return '#722ed1'; // Afternoon - purple
    return '#fa8c16'; // Evening - orange
  };

  // Helper function to extract activity tags
  const getActivityTags = (description) => {
    const tags = [];
    const lowerDesc = description.toLowerCase();
    
    // Activity type tags
    if (lowerDesc.includes('visit') || lowerDesc.includes('explore') || lowerDesc.includes('tour')) 
      tags.push('Sightseeing');
    if (lowerDesc.includes('lunch') || lowerDesc.includes('dinner') || lowerDesc.includes('breakfast') || lowerDesc.includes('café') || lowerDesc.includes('restaurant')) 
      tags.push('Dining');
    if (lowerDesc.includes('museum') || lowerDesc.includes('gallery') || lowerDesc.includes('exhibition')) 
      tags.push('Museum');
    if (lowerDesc.includes('park') || lowerDesc.includes('garden') || lowerDesc.includes('nature')) 
      tags.push('Outdoors');
    if (lowerDesc.includes('shop') || lowerDesc.includes('market') || lowerDesc.includes('store')) 
      tags.push('Shopping');
    
    // Return at most 2 tags
    return tags.slice(0, 2);
  };

  // Save itinerary to localStorage
  const saveItinerary = () => {
    try {
      localStorage.setItem('savedItinerary', JSON.stringify({
        destination: formData.destination,
        dates: [formData.startDate.format('YYYY-MM-DD'), formData.endDate.format('YYYY-MM-DD')],
        itinerary: itinerary
      }));
      message.success('Itinerary saved successfully!');
    } catch (error) {
      console.error('Error saving itinerary:', error);
      message.error('Could not save itinerary');
    }
  };

  // Share itinerary
  const shareItinerary = () => {
    message.info('Sharing functionality will be implemented in a future update');
  };

  // Print itinerary
  const printItinerary = () => {
    window.print();
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderDestinationStep();
      case 1:
        return renderDatesStep();
      case 2:
        return renderTransportationStep();
      case 3:
        return renderInterestsStep();
      case 4:
        return renderItineraryStep();
      default:
        return null;
    }
  };

  // Render sidebar content
  const renderSidebar = () => (
    <div className="planner-sidebar">
      {weatherData && (
        <div className="weather-card">
          <div className="weather-icon">
            <CloudOutlined style={{ fontSize: '2rem' }} />
          </div>
          <div className="weather-details">
            <div className="weather-location">{weatherData.location}</div>
            <div className="temp">{weatherData.current.temp}°C</div>
            <div className="conditions">{weatherData.current.conditions}</div>
          </div>
        </div>
      )}
      
      {locations.length > 0 && (
        <div className="map-container">
          <div style={{ marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
            <CompassOutlined style={{ marginRight: '0.5rem' }} />
            Suggested Locations
          </div>
          <div className="map">
            <MapComponent 
              locations={locations.map(loc => ({
                name: loc.name,
                position: [loc.position[0], loc.position[1]]
              }))}
              center={[locations[0].position[0], locations[0].position[1]]}
            />
          </div>
        </div>
      )}

      <div className="trip-summary-card">
        <h2>Trip Summary</h2>
        
        <div className="trip-info-item">
          <div className="trip-info-label">Destination:</div>
          <div className="trip-info-value">{formData.destination}</div>
        </div>
        
        <div className="trip-info-item">
          <div className="trip-info-label">Dates:</div>
          <div className="trip-info-value">
            {formData.startDate.format('MMM D')} - {formData.endDate.format('MMM D, YYYY')}
          </div>
        </div>
        
        <div className="trip-info-item">
          <div className="trip-info-label">Duration:</div>
          <div className="trip-info-value">{duration} days</div>
        </div>
        
        <div className="trip-info-item">
          <div className="trip-info-label">Transportation:</div>
          <div className="trip-info-value">
            {transportationOptions.find(opt => opt.value === formData.transportation)?.label || formData.transportation}
          </div>
        </div>
        
        <div className="trip-info-item">
          <div className="trip-info-label">Traveling with:</div>
          <div className="trip-info-value">
            {companionOptions.find(opt => opt.value === formData.companions)?.label || formData.companions}
          </div>
        </div>
        
        {formData.interests.length > 0 && (
          <div className="trip-info-item">
            <div className="trip-info-label">Interests:</div>
            <div className="trip-info-value">
              {formData.interests.map(interest => {
                const interestOption = interestOptions.find(opt => opt.value === interest);
                return (
                  <Tag key={interest} style={{ marginBottom: '0.5rem' }}>
                    {interestOption?.icon} {interestOption?.label}
                  </Tag>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render chat
  const renderChat = () => {
    return (
      <>
        <div 
          className="floating-chat-button" 
          onClick={() => setIsChatOpen(true)}
        >
          <Button type="primary" shape="circle" icon={<CustomerServiceOutlined className="chat-icon" />} />
          <span className="chat-label">Ask me</span>
        </div>

        <Modal
          title={
            <div className="chat-modal-header">
              <div className="chat-modal-title">Travel Assistant</div>
            </div>
          }
          open={isChatOpen}
          onCancel={() => setIsChatOpen(false)}
          footer={null}
          className="chat-modal"
          width={400}
          style={{ top: 20 }}
          bodyStyle={{ padding: 0, height: '500px', display: 'flex', flexDirection: 'column' }}
        >
          <div className="chat-messages">
            {helpMessages.length === 0 ? (
              <div className="welcome-message">
                <div className="welcome-icon">✨</div>
                <div>
                  <p>Hi there! I'm your personal travel assistant.</p>
                  <p>Let me help you plan your trip to {formData.destination || 'your dream destination'}.</p>
                  <p className="welcome-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ) : (
              helpMessages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`chat-message ${msg.role === 'user' ? 'user-message' : 'bot-message'}`}
                >
                  {msg.content}
                </div>
              ))
            )}
            
            {isProcessing && (
              <div className="chat-message bot-message">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>
          
          <div className="chat-input">
            <Input 
              placeholder="Type your message..." 
              value={helpInput} 
              onChange={(e) => setHelpInput(e.target.value)}
              onPressEnter={() => handleHelpMessage()}
              disabled={isProcessing}
            />
            <Button 
              type="primary" 
              onClick={() => handleHelpMessage()}
              disabled={isProcessing || !helpInput.trim()}
              icon={<SendOutlined />}
              className="send-button"
            />
          </div>
        </Modal>
      </>
    );
  };

  return (
    <div className="travel-planner">
      <div className="planner-header">
        <Title level={2}>Plan Your Trip to {formData.destination || 'Your Dream Destination'}</Title>
        <Steps current={currentStep} style={{ maxWidth: '800px', margin: '24px auto' }}>
          <Step title="Destination" icon={<EnvironmentOutlined />} />
          <Step title="Dates" icon={<CalendarOutlined />} />
          <Step title="Travel" icon={<CarOutlined />} />
          <Step title="Interests" icon={<HeartOutlined />} />
          <Step title="Itinerary" icon={<RocketOutlined />} />
        </Steps>
      </div>

      <div className="travel-planner-layout">
        {/* Main content area */}
        <div className="planner-main">
          <div className="step-card" style={{ backgroundColor: '#333333', borderRadius: '12px', padding: '1.5rem' }}>
            {loading && currentStep !== 4 ? (
              <div className="loading-container" style={{ textAlign: 'center', padding: '40px' }}>
                <Spin size="large" />
                <div style={{ marginTop: '16px', color: '#ffffff' }}>
                  Loading...
                </div>
              </div>
            ) : (
              renderStepContent()
            )}
            
            <div className="step-actions">
              <div className="step-buttons">
                {currentStep > 0 && (
                  <Button 
                    onClick={handlePrev}
                    style={{ marginRight: '8px' }}
                    className="prev-button"
                  >
                    Previous
                  </Button>
                )}
                
                {currentStep < 4 && (
                  <Button 
                    type="primary" 
                    onClick={handleNext}
                    disabled={!isStepValid()}
                    className="next-button"
                  >
                    {currentStep === 3 ? 'Generate Itinerary' : 'Next'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Sidebar area */}
        <div className="planner-sidebar">
          {renderSidebar()}
        </div>
      </div>

      {/* Chat */}
      {renderChat()}
    </div>
  );
};

export default TravelPlanner;
