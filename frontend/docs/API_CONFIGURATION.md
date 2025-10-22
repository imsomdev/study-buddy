# API Configuration

The frontend uses a centralized API configuration to manage the backend URL. This makes it easy to change the backend URL in one place.

## Configuration

The API base URL can be configured in the following ways (in order of priority):

1. **Environment Variable**: Set `NEXT_PUBLIC_API_BASE_URL` in your environment
2. **Fallback**: If no environment variable is set, the default `http://localhost:8000` will be used

## Setting Environment Variables

Create a `.env.local` file in the `frontend` directory:

```bash
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com
```

Or if running locally with a different port:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

## API Endpoints

The following endpoints are defined in `lib/api.ts`:

- `API_ENDPOINTS.uploadFile` - File upload endpoint
- `API_ENDPOINTS.generateMcq` - MCQ generation endpoint  
- `API_ENDPOINTS.mcqQuestionCount(filename)` - Get question count for a file
- `API_ENDPOINTS.mcqQuestions(filename, questionIndex)` - Get specific question
- `API_ENDPOINTS.validateAnswer` - Validate answer endpoint

## Development

After changing the API URL, restart your development server:

```bash
npm run dev
```