FROM alpine:3.21
RUN apk add --no-cache bash coreutils procps git openssl drill && git clone --depth 1 https://github.com/testssl/testssl.sh.git /opt/testssl && ln -s /opt/testssl/testssl.sh /usr/local/bin/testssl.sh && adduser -D -u 10001 scanner && mkdir /output && chown scanner:scanner /output
USER scanner
WORKDIR /output
ENTRYPOINT ["bash", "/opt/testssl/testssl.sh"]
