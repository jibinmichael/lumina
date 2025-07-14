// API Configuration
const API_CONFIG = {
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  IS_CONFIGURED: !!import.meta.env.VITE_OPENAI_API_KEY && import.meta.env.VITE_OPENAI_API_KEY !== 'sk-YOUR-API-KEY-HERE'
}
 
export default API_CONFIG 