FROM golang:1.23-alpine AS builder
RUN go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
FROM python:3.12-alpine
RUN apk add --no-cache bind-tools && adduser -D -u 10001 scanner
COPY --from=builder /go/bin/subfinder /usr/local/bin/subfinder
COPY public_assessment.py /app/public_assessment.py
USER scanner
WORKDIR /app
ENTRYPOINT ["python", "/app/public_assessment.py"]
