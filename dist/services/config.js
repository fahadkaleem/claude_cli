import * as dotenv from 'dotenv';
// Load .env file silently
dotenv.config({ quiet: true });
export const getConfig = () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not found in environment variables.\n' +
            'Please create a .env file with your API key or set it as an environment variable.');
    }
    return {
        apiKey,
        model: 'claude-sonnet-4-20250514',
        maxTokens: 4096
    };
};
//# sourceMappingURL=config.js.map