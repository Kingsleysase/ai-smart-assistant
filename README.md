# AI Smart Assistant for Visually Impaired Users

A fully accessible, voice-enabled AI assistant built with Next.js, designed specifically for visually impaired users. Features speech-to-text input, text-to-speech responses, smart chat capabilities, and image analysis.

## Features

- 🎤 **Voice Input**: Browser-native speech recognition
- 🔊 **Voice Output**: Text-to-speech for all responses
- 🤖 **Smart Chat**: AI-powered conversations using DeepSeek R1
- 📸 **Image Analysis**: Detailed image descriptions using GPT-4o
- ♿ **Accessibility**: Screen reader friendly, keyboard navigation
- 🌙 **Dark Mode**: Eye-friendly dark interface by default
- 📱 **Responsive**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **APIs**: OpenRouter.ai (DeepSeek R1 + GPT-4o)
- **Speech**: Web Speech API, SpeechSynthesis API
- **Deployment**: Vercel

## Setup Instructions

### 1. Clone and Install

\`\`\`bash
git clone <your-repo>
cd smart-ai-assistant
npm install
\`\`\`

### 2. Environment Variables

Create a `.env.local` file in the root directory:

\`\`\`env
OPENROUTER_DEEPSEEK_API_KEY=your_deepseek_api_key_here
OPENROUTER_OPENAI_API_KEY=your_openai_api_key_here
\`\`\`

**Getting your OpenRouter API Keys:**

1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Sign up for a free account
3. Go to [API Keys](https://openrouter.ai/keys)
4. Create a new API key
5. You can use the same key for both variables, or create separate keys for better tracking

**Note**: You can use the same OpenRouter API key for both `OPENROUTER_DEEPSEEK_API_KEY` and `OPENROUTER_OPENAI_API_KEY` if you prefer to use a single key.

### 3. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Deploy to Vercel

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Add the `OPENROUTER_API_KEY` environment variable in Vercel dashboard
4. Deploy!

## Usage Guide

### Voice Interaction
1. Click "Start Voice Input" button
2. Speak your question or command
3. The assistant will respond with both text and speech

### Image Analysis
1. Click "Analyze Image" button
2. Select an image file
3. The assistant will describe the image in detail

### Accessibility Features
- Large, high-contrast buttons
- ARIA labels for screen readers
- Keyboard navigation support
- Voice-first interaction design
- Clear audio feedback

## Browser Compatibility

- **Chrome**: Full support (recommended)
- **Edge**: Full support
- **Firefox**: Limited speech recognition support
- **Safari**: Limited speech recognition support

For best experience, use Chrome or Edge browsers.

## API Costs

- **DeepSeek R1**: Free tier available on OpenRouter
- **GPT-4o**: Pay-per-use on OpenRouter (very affordable)
- **Speech APIs**: Free (browser-native)

## Troubleshooting

### Speech Recognition Not Working
- Ensure you're using Chrome or Edge
- Check microphone permissions
- Make sure you're on HTTPS (required for speech API)

### API Errors
- Verify your OpenRouter API key is correct
- Check your OpenRouter account balance
- The app will fall back to mock responses if API fails

### Deployment Issues
- Ensure environment variables are set in Vercel
- Check build logs for any errors
- Verify your domain is HTTPS (required for speech APIs)

## Contributing

This project is designed to be accessible and helpful for visually impaired users. When contributing:

1. Test with screen readers
2. Ensure keyboard navigation works
3. Maintain high contrast ratios
4. Keep voice interactions natural
5. Follow WCAG accessibility guidelines

## License

MIT License - feel free to use and modify for your needs.
