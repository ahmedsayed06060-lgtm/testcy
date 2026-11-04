FROM ghcr.io/zaproxy/zaproxy:stable
USER root
RUN mkdir -p /output && chown -R 10001:10001 /output
USER 10001
WORKDIR /output
ENTRYPOINT ["/zap/zap-baseline.py"]
