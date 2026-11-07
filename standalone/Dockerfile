# LeetCode Lab — standalone image (app + judge toolchains).
# Build:  docker build -t leetcode-lab ../
#   (context must be the leetcode-lab root: standalone/Dockerfile)
# Run:    docker run -p 8080:8080 -e LLMAI_API_KEY=... \
#           -v leetcode-lab-progress:/app/plugin/data \
#           leetcode-lab
FROM node:22-bookworm-slim

# Judge toolchains: Java + C++.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openjdk-17-jdk-headless g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY plugin ./plugin
COPY standalone ./standalone

ENV PORT=8080
EXPOSE 8080

# Persist progress across restarts (the dataset itself stays in the image).
ENV LCLAB_PROGRESS=/data/progress.json
VOLUME ["/data"]

CMD ["node", "standalone/server.mjs"]
