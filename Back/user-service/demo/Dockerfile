# syntax=docker/dockerfile:1.7

# =====================================================================
# Multi-stage Dockerfile — สลับ stage ได้จาก docker-compose `target:`
#   - dev      → JDK + Maven wrapper + spring-boot:run + DevTools hot reload
#   - builder  → build JAR (skipTests)
#   - runtime  → JRE + JAR (production)
# =====================================================================

# ---------- Stage: dev (hot reload via spring-boot-devtools + bind mount) ----------
FROM eclipse-temurin:25-jdk AS dev
WORKDIR /app

# ติดตั้ง dependency ล่วงหน้า — layer นี้จะถูก cache จนกว่า pom.xml จะเปลี่ยน
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN chmod +x mvnw
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw -B -ntp \
        -Dmaven.wagon.http.retryHandler.count=5 \
        dependency:go-offline -DskipTests || true

# ต้องมี source ใน image — `compose build` / รัน image โดยไม่ bind mount จะได้หา main class เจอ
# compose-dev ยัง mount ./Back/user-service/demo:/app ทับได้เมื่อต้องการ hot reload
COPY src src

EXPOSE 8080

# spring-boot:run จะรวม spring-boot-devtools ให้อัตโนมัติ (ไม่เหมือน mvn package)
# DevTools จะ watch /app/target/classes — IDE บน host compile-on-save → bind mount → restart
CMD ["./mvnw", "-B", "-ntp", "spring-boot:run", "-Dspring-boot.run.mainClass=com.example.demo.DemoApplication"]


# ---------- Stage: builder (production JAR build) ----------
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

# ---------- Stage: runtime (production) ----------
FROM eclipse-temurin:25-jre AS runtime
WORKDIR /app

# คัดลอก JAR ที่ build ได้ (ใช้ wildcard เพราะชื่อมี version)
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

# spring-boot อ่าน SPRING_DATASOURCE_* / SPRING_PROFILES_ACTIVE จาก env อัตโนมัติ
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-jar", "app.jar"]
