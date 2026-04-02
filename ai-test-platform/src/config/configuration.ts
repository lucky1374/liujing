export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'ai_test_platform',
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV !== 'production',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.AI_MODEL || 'gpt-4',
  },

  runner: {
    pythonRunnerUrl: process.env.PYTHON_RUNNER_URL || 'http://localhost:8001',
    authToken: process.env.RUNNER_AUTH_TOKEN || '',
    httpRetryCount: parseInt(process.env.RUNNER_HTTP_RETRY_COUNT || '2', 10),
    httpRetryDelayMs: parseInt(process.env.RUNNER_HTTP_RETRY_DELAY_MS || '500', 10),
    httpRetryIdempotentOnly: String(process.env.RUNNER_HTTP_RETRY_IDEMPOTENT_ONLY || 'true').toLowerCase() === 'true',
  },

  taskCallback: {
    timeoutMs: parseInt(process.env.TASK_CALLBACK_TIMEOUT_MS || '5000', 10),
    retryCount: parseInt(process.env.TASK_CALLBACK_RETRY_COUNT || '2', 10),
    retryDelayMs: parseInt(process.env.TASK_CALLBACK_RETRY_DELAY_MS || '1000', 10),
    secret: process.env.TASK_CALLBACK_SECRET || '',
  },
});
