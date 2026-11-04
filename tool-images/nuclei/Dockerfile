FROM projectdiscovery/nuclei:latest
USER root
RUN adduser -D -u 10001 scanner 2>/dev/null || true && mkdir -p /output && chown -R 10001:10001 /output
USER 10001
WORKDIR /output
ENTRYPOINT ["nuclei"]
