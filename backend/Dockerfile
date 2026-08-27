FROM gradle:7.6.4-jdk11 AS build
WORKDIR /workspace
COPY settings.gradle build.gradle ./
COPY backend/build.gradle backend/build.gradle
COPY backend/src backend/src
RUN gradle --no-daemon :backend:bootJar

FROM eclipse-temurin:11-jre
WORKDIR /app
RUN useradd --system --uid 10001 suuns
COPY --from=build /workspace/backend/build/libs/backend-0.1.0.jar app.jar
USER suuns
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar", "--spring.profiles.active=production"]
