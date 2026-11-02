FROM node:24-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 5180
# --host: listen beyond the container's loopback so the published port reaches it
CMD ["npx", "vite", "--host", "0.0.0.0"]
