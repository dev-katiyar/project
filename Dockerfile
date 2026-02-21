# build stage
FROM node:20.19-alpine AS build

WORKDIR /app

COPY package*.json ./

ENV NODE_OPTIONS="--max-old-space-size=8196"

RUN npm install

COPY . .

RUN npm run build -- --configuration production --aot

# run time
FROM nginx:alpine

# build out put
COPY --from=build /app/dist/web/ /usr/share/nginx/html/

# nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy SSL certificates
COPY ssl/ /etc/nginx/ssl/
RUN chmod 600 /etc/nginx/ssl/*.key && \
    chmod 644 /etc/nginx/ssl/*.crt && \
    chown -R nginx:nginx /etc/nginx/ssl/

EXPOSE 80
EXPOSE 443