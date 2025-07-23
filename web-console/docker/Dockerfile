# Use an official Node.js runtime as a parent image.
# Using a specific version is good practice for stability.
FROM node:18-slim

# Set the working directory in the container to /usr/src/app
WORKDIR /usr/src/app

# --- INSTALL DOCKER CLI ---
# We update the package lists and install the Docker client.
RUN apt-get update && \
    apt-get install -y --no-install-recommends docker.io && \
    # Clean up the apt cache to keep the image size down
    rm -rf /var/lib/apt/lists/*

# --- GRANT PERMISSIONS ---
# Add the 'node' user (which runs the app) to the 'docker' group.
# This is the crucial step to fix the "Cannot connect to the Docker daemon" error.
RUN usermod -aG docker node

# Copy package.json and package-lock.json (or yarn.lock)
# This step is cached by Docker, so 'npm install' only runs when dependencies change.
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source inside the Docker image
COPY . .

# Define the command to run your app
CMD [ "node", "src/app.js" ]
