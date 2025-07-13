# AI Setup Instructions for Lumina Notes

## Quick Setup

To enable AI synthesis in Lumina Notes, you need to configure your OpenAI API key:

1. Open the file `src/config/apiConfig.js`

2. Replace `'sk-YOUR-API-KEY-HERE'` with your actual OpenAI API key:
   ```javascript
   const API_CONFIG = {
     // Replace with your actual OpenAI API key
     OPENAI_API_KEY: 'sk-proj-...',  // Your actual key here
     
     // Set to true when you've added your API key
     IS_CONFIGURED: true
   }
   ```

3. Set `IS_CONFIGURED` to `true`

4. Save the file and refresh the app

## Features Once Configured

### 1. AI Synthesis with Node Citations
- The AI will synthesize your nodes into a structured summary
- Each synthesis includes citations like (N001, N002) referencing specific nodes
- Updates automatically after 3 seconds of no changes
- Minimum 2 nodes with content required

### 2. Dynamic Placeholders
- Empty nodes connected to nodes with content will show contextual placeholders
- Placeholders suggest next steps based on connected node content
- Updates when new connections are made

### 3. Rate Limiting
- Limited to 10 requests per minute to prevent excessive API usage
- Clear error messages when limits are exceeded

## Important Notes

- **Security**: Never commit your API key to version control
- **Production**: In production, use environment variables instead of hardcoding
- **Costs**: Be aware of OpenAI API costs - each synthesis request uses tokens

## Troubleshooting

If synthesis isn't working:
1. Check that `IS_CONFIGURED` is set to `true`
2. Verify your API key is valid
3. Check the browser console for error messages
4. Ensure you have at least 2 nodes with content

## Model Configuration

The app uses GPT-4 by default. You can change this in `src/services/aiService.js`:
```javascript
const AI_SERVICE_CONFIG = {
  MODEL: 'gpt-4o',  // Change to 'gpt-3.5-turbo' for cheaper option
  // ...
}
``` 