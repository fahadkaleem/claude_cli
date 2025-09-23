# How to Run Claude CLI Chat

## Setup

1. Make sure you have added your Anthropic API key to `.env`:
   ```
   ANTHROPIC_API_KEY=your_actual_key_here
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the App

### Option 1: Run in Development Mode
```bash
npm run dev
```

### Option 2: Run the Simple Demo
```bash
node demo.js
```

### Option 3: Install Globally and Run
```bash
npm install -g .
claude-chat
```

## Important Notes

- The full Ink-based CLI app (`npm run dev` or `claude-chat`) requires an interactive terminal with TTY support
- It will NOT work when:
  - Output is piped or redirected
  - Running in CI/CD environments
  - Running through automation tools
  - Running in non-interactive shells

- For these scenarios, use the simple `demo.js` script instead

## Controls (Full App)

- **Ctrl+Enter**: Send message
- **Enter**: Add new line
- **Ctrl+L**: Clear chat
- **Ctrl+C**: Exit

## Troubleshooting

If you see "Raw mode is not supported" error:
- Make sure you're running in a real terminal (Terminal.app, iTerm2, etc.)
- Don't pipe the output or run through other tools
- Run directly in your terminal: `npm run dev`

The app is working correctly - it just needs to be run in an interactive terminal environment!