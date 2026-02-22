FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps
RUN npm install leaflet react-leaflet --legacy-peer-deps

COPY . .

EXPOSE 3000

ENV REACT_APP_API_URL=http://localhost:3000/api

CMD ["npm", "start"]

