# docker/Dockerfile

# 1. Base Image: Use an official Node.js runtime as a parent image.
# Using a specific version is recommended for stability.
FROM node:18-alpine

# 2. Working Directory: Set the working directory in the container.
# All subsequent commands (COPY, RUN, etc.) will be executed from this path.
WORKDIR /usr/src/app

# 3. Install Dependencies: Copy package.json and package-lock.json first.
# This leverages Docker's build cache. The npm install step will only be re-run
# if these files change, not on every code change.
COPY package*.json ./
RUN npm install

# 4. Copy Application Code: Copy the rest of your application's source code.
COPY . .

# 5. Expose Port: Make the port available to the host.
# This should match the port your app listens on.
EXPOSE 3000

# 6. Run Command: Define the command to run your app.
CMD [ "node", "src/app.js" ]
