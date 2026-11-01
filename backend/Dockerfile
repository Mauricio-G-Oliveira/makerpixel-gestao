# Build stage
FROM maven:3.9.9-eclipse-temurin-21-jammy AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN groupadd -r makerpixel && useradd -r -g makerpixel makerpixel
COPY --from=build /app/target/*.jar app.jar
USER makerpixel
EXPOSE 8080
ENV TZ=America/Sao_Paulo
ENTRYPOINT ["java", "-jar", "app.jar"]
