# FastAPI Backend Integration Setup

This guide explains how to set up the integration with your FastAPI backend service.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# FastAPI Backend Configuration
FASTAPI_BASE_URL=http://localhost:8000
FASTAPI_API_KEY=your_fastapi_api_key
```

## FastAPI Backend Requirements

Your FastAPI backend should have the following endpoint:

### POST `/chat`

**Request Body:**
```json
{
  "user_id": "string",
  "conversation_id": "string", 
  "message": "string",
  "context": "string (optional)",
  "conversation_history": [
    {
      "sender": "user|ai",
      "content": "string",
      "timestamp": "string"
    }
  ]
}
```

**Response Body:**
```json
{
  "response": "string",
  "metadata": {
    "model": "string",
    "tokens_used": "number",
    "processing_time": "number"
  }
}
```

## API Endpoint Details

The new `/api/chat` endpoint:

1. **Validates user authentication** - Ensures the user is logged in
2. **Verifies conversation ownership** - Checks that the user owns the conversation
3. **Sanitizes input** - Cleans and validates the user message
4. **Fetches conversation history** - Gets the last 10 messages for context
5. **Forwards to FastAPI** - Sends the request to your FastAPI backend
6. **Returns response** - Returns the AI response with metadata

## Error Handling

The endpoint handles various error scenarios:
- Rate limiting (10 requests per minute)
- Authentication errors
- Authorization errors (user doesn't own conversation)
- Input validation errors
- FastAPI backend errors

## Usage

The frontend now uses the new `apiClient.sendChatMessage()` method:

```typescript
const response = await apiClient.sendChatMessage(
  conversationId, 
  userMessage, 
  optionalContext
)
```

## Testing

To test the integration:

1. Start your FastAPI backend on `http://localhost:8000`
2. Set the environment variables
3. Send a message through the chat interface
4. Check the browser network tab to see the API calls

## Security Notes

- All requests are authenticated via Supabase
- Input is sanitized before sending to FastAPI
- Rate limiting is applied to prevent abuse
- Conversation ownership is verified 