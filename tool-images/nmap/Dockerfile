FROM alpine:3.21
RUN apk add --no-cache nmap=7.95-r0 nmap-scripts=7.95-r0 && adduser -D -u 10001 scanner && mkdir /output && chown scanner:scanner /output
USER scanner
WORKDIR /output
ENTRYPOINT ["nmap"]
