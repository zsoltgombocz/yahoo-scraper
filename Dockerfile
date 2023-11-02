FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run tsc
RUN rm -rf node_modules
RUN yarn install --production
CMD [ "npm", "run", "start:prod" ]