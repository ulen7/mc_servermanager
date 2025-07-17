# Use official Node.js LTS image
FROM node:18

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package files and install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Set environment variable to production
ENV NODE_ENV=production

# Expose the port (default: 3000)
EXPOSE 3000

# Start the app
CMD ["node", "src/app.js"]
