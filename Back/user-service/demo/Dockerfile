# syntax=docker/dockerfile:1.7

# ---------- Stage 1: build JAR ด้วย Maven wrapper ----------
FROM eclipse-temurin:25-jdk AS builder
WORKDIR /app

# คัดลอก project files ทั้งหมดที่ต้องใช้ build (รวม source — รวมเป็น layer เดียวเพราะ
# cache mount ของ .m2 ทำหน้าที่ persist dependency ระหว่าง build อยู่แล้ว)
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
COPY src src

RUN chmod +x mvnw

# Maven build:
#  - cache mount: persist .m2 ระหว่าง build → ครั้งถัดไปไม่ต้องดาวน์โหลดใหม่
#  - retryHandler.count=5: retry HTTP transient failure (กัน "SSL peer shut down incorrectly")
#  - skipTests: build เร็วใน CI/dev
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw -B -ntp \
        -Dmaven.wagon.http.retryHandler.count=5 \
        -Dmaven.wagon.http.retryHandler.requestSentEnabled=true \
        -Dmaven.wagon.httpconnectionManager.ttlSeconds=120 \
        clean package -DskipTests

# ---------- Stage 2: runtime ----------
FROM eclipse-temurin:25-jre
WORKDIR /app

# คัดลอก JAR ที่ build ได้ (ใช้ wildcard เพราะชื่อมี version)
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

# spring-boot อ่าน SPRING_DATASOURCE_* / SPRING_PROFILES_ACTIVE จาก env อัตโนมัติ
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-jar", "app.jar"]
