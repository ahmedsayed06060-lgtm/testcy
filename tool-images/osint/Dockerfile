FROM golang:1.23-alpine AS builder
RUN go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@v2.8.0 && \
    go install -v github.com/owasp-amass/amass/v4/cmd/amass@v4.2.0

FROM python:3.12-alpine
RUN apk add --no-cache bind-tools git && \
    adduser -D -u 10001 scanner && \
    pip install --no-cache-dir maigret==0.6.6 && \
    git clone --depth 1 https://github.com/laramies/theHarvester.git /opt/theHarvester && \
    pip install --no-cache-dir -r /opt/theHarvester/requirements.txt && \
    chmod +x /opt/theHarvester/theHarvester.py && \
    ln -s /opt/theHarvester/theHarvester.py /usr/local/bin/theHarvester
COPY --from=builder /go/bin/subfinder /usr/local/bin/subfinder
COPY --from=builder /go/bin/amass /usr/local/bin/amass
COPY public_assessment.py /app/public_assessment.py
ENV PYTHONPATH=/opt/theHarvester
USER scanner
WORKDIR /app
ENTRYPOINT ["python", "/app/public_assessment.py"]
