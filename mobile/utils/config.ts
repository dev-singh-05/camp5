// API Configuration for Mobile App
// Change this to your production URL when deploying

// For local development, use your computer's local IP address
// Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find your local IP
// Example: http://192.168.1.100:3000

// For production, use your deployed URL
// Example: https://yourapp.vercel.app

export const API_URL = __DEV__
  ? "http://192.168.1.66:3000" // Local development - using network IP instead of localhost
  : "https://your-production-url.com"; // Replace with your production URL

export const API_ENDPOINTS = {
  SIGNUP: `${API_URL}/api/auth/signup`,
  LOGIN: `${API_URL}/api/auth/login`,
  // Add more endpoints as needed
};
