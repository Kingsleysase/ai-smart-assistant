# AI Smart Assistant for Visually Impaired Users

A comprehensive, voice-enabled AI assistant built with Next.js, designed specifically for visually impaired users. Features speech-to-text input, text-to-speech responses, smart chat capabilities, real-time object detection, and voice-guided navigation.

## 🚀 Features

- 🎤 **Voice Input**: Browser-native speech recognition
- 🔊 **Voice Output**: Text-to-speech for all responses
- 🤖 **Smart Chat**: AI-powered conversations using DeepSeek R1
- 📸 **Image Analysis**: Detailed image descriptions using GPT-4o
- 👁️ **Real-Time Object Detection**: Live camera-based object and person detection using TensorFlow.js
- 🧭 **Voice-Guided Navigation**: Turn-by-turn directions with Mapbox and HERE Maps integration
- ♿ **Accessibility**: Screen reader friendly, keyboard navigation
- 🌙 **Dark Mode**: Eye-friendly dark interface by default
- 📱 **Responsive**: Works on desktop and mobile devices

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **AI APIs**: OpenRouter.ai (DeepSeek R1 + GPT-4o)
- **Object Detection**: TensorFlow.js with COCO-SSD model
- **Navigation**: Mapbox API & HERE Maps API (with automatic fallback)
- **Speech**: Web Speech API, SpeechSynthesis API
- **Deployment**: Vercel

## 📋 Setup Instructions

### 1. Clone and Install

\`\`\`bash
git clone <your-repo>
cd smart-ai-assistant
npm install
\`\`\`

### 2. Environment Variables

Create a `.env.local` file in the root directory:

\`\`\`env
# OpenRouter API Keys
OPENROUTER_DEEPSEEK_API_KEY=your_deepseek_api_key_here
OPENROUTER_OPENAI_API_KEY=your_openai_api_key_here

# Mapbox API Key (Primary navigation service)
MAPBOX_API_KEY=your_mapbox_api_key_here

# HERE Maps API Key (Fallback navigation service)
HERE_MAP_API_KEY=your_here_map_api_key_here
\`\`\`

**Getting your API Keys:**

1. **OpenRouter API Keys:**
   - Visit [OpenRouter.ai](https://openrouter.ai)
   - Sign up for a free account
   - Go to [API Keys](https://openrouter.ai/keys)
   - Create a new API key
   - You can use the same key for both variables

2. **Mapbox API Key:**
   - Go to [Mapbox](https://www.mapbox.com/)
   - Create a free account
   - Go to [Account Dashboard](https://account.mapbox.com/)
   - Copy your default public token or create a new one
   - Free tier includes 50,000 requests/month

3. **HERE Maps API Key:**
   - Go to [HERE Developer Portal](https://developer.here.com/)
   - Create a free account
   - Create a new project
   - Generate an API key
   - Free tier includes 250,000 requests/month

### 3. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Deploy to Vercel

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy!

## 🎯 Usage Guide

### Voice Interaction
1. Click "Start Voice" button
2. Speak your question or command
3. The assistant will respond with both text and speech

### Object Detection
1. Say "What's in front of me?" or click the Object Detection tab
2. Allow camera access when prompted
3. The assistant will describe objects and people in real-time
4. Visual bounding boxes show detected items

### Navigation
1. Say "Take me to [destination]" or click the Navigation tab
2. Allow location access when prompted
3. Speak or type your destination
4. Follow turn-by-turn voice directions
5. System automatically uses Mapbox or HERE Maps for best results

### Voice Commands
- **"What's in front of me?"** - Activates object detection
- **"What do you see?"** - Scans current camera view
- **"Take me to [place]"** - Starts navigation
- **"Navigate to [destination]"** - Alternative navigation command

## 🌐 Browser Compatibility

- **Chrome**: Full support (recommended)
- **Edge**: Full support
- **Firefox**: Limited speech recognition support
- **Safari**: Limited speech recognition support

For best experience, use Chrome or Edge browsers.

## 💰 API Costs

- **DeepSeek R1**: Free tier available on OpenRouter
- **GPT-4o**: Pay-per-use on OpenRouter (very affordable)
- **Mapbox**: Free tier (50,000 requests/month)
- **HERE Maps**: Free tier (250,000 requests/month)
- **TensorFlow.js**: Free (runs locally in browser)
- **Speech APIs**: Free (browser-native)

## 🔧 Troubleshooting

### Speech Recognition Not Working
- Ensure you're using Chrome or Edge
- Check microphone permissions
- Make sure you're on HTTPS (required for speech API)

### Camera Detection Issues
- Allow camera access when prompted
- Ensure good lighting for better detection
- Use Chrome or Edge for best performance

### Navigation Problems
- Allow location access when prompted
- Check your Mapbox or HERE Maps API keys are valid
- The system will automatically try both services
- Check the API status panel for detailed diagnostics

### API Errors
- Verify your OpenRouter API keys are correct
- Check your Mapbox and HERE Maps API keys and quotas
- The app will provide fallback responses if APIs fail

## ♿ Accessibility Features

- **Large, high-contrast buttons** optimized for low vision
- **Complete keyboard navigation** support
- **ARIA labels** and screen reader compatibility
- **Voice-first interaction** design
- **Clear status announcements** ("Listening...", "Processing...")
- **Ability to stop speech** at any time
- **Visual and audio feedback** for all actions

## 🎙️ Voice Commands Reference

| Command | Action |
|---------|--------|
| "What's in front of me?" | Activates object detection mode |
| "What do you see?" | Scans current camera view |
| "Take me to [destination]" | Starts navigation to destination |
| "Navigate to [place]" | Alternative navigation command |
| "Repeat direction" | Repeats current navigation instruction |
| "Next direction" | Moves to next navigation step |
| "Stop navigation" | Ends current navigation session |

## 🗺️ Navigation Features

- **Dual Provider Support**: Uses both Mapbox and HERE Maps
- **Automatic Fallback**: If one service fails, automatically tries the other
- **Global Coverage**: Works worldwide with local optimizations
- **Walking Directions**: Optimized for pedestrian navigation
- **Voice-Friendly Instructions**: Natural language directions
- **Real-time Updates**: Live step-by-step guidance

## 🤝 Contributing

This project is designed to be accessible and helpful for visually impaired users. When contributing:

1. Test with screen readers
2. Ensure keyboard navigation works
3. Maintain high contrast ratios
4. Keep voice interactions natural
5. Follow WCAG accessibility guidelines
6. Test camera and location permissions
7. Verify cross-browser compatibility

## 📄 License

MIT License - feel free to use and modify for your needs.

## 🙏 Acknowledgments

- TensorFlow.js team for the COCO-SSD model
- OpenRouter.ai for accessible AI APIs
- Mapbox for navigation services
- HERE Maps for reliable fallback navigation
- The accessibility community for guidance and feedback
