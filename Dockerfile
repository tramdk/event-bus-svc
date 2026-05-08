# Use Node.js 20 (LTS)
FROM node:20-slim

# Create and define the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the port Hugging Face expects (7860)
ENV PORT=7860
EXPOSE 7860

# Start the application
CMD ["npm", "start"]
