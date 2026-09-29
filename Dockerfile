# College Navigator — Java Backend for Railway
# Multi-stage build: Maven build → JDK 17 runtime

# ── Stage 1: Build ──
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy Maven config first (cache dependencies)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and data, then build
COPY src/ src/
COPY data/ data/
RUN mvn package -DskipTests -B

# ── Stage 2: Runtime ──
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copy the built JAR and dependencies
COPY --from=build /app/target/cse-block-navigator.jar ./target/cse-block-navigator.jar
COPY --from=build /app/target/dependency/ ./target/dependency/

# Copy data files (nodes.json, edges.json, rooms.json) — required at runtime
COPY data/ data/

# Railway injects PORT env var; WebServer reads it in main()
EXPOSE ${PORT:-8000}

# Start the WebServer (not Main — WebServer serves the API)
CMD ["java", "-cp", "target/cse-block-navigator.jar:target/dependency/*", "com.cse.navigator.web.WebServer"]
