FROM oven/bun:alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Start the bot
CMD ["bun", "run", "src/index.js"]
