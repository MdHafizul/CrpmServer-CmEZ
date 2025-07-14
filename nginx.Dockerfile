FROM nginx:alpine
COPY client-side/status21-app/nginx.conf /etc/nginx/conf.d/default.conf