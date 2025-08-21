FROM nginx:stable-alpine

COPY nginx/reverse-proxy.conf /etc/nginx/conf.d/default.conf