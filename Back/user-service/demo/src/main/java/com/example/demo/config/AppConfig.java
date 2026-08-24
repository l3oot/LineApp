package com.example.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    /**
     * [Debug Step 3/4: Line Hook / Network] เดิม {@code new RestTemplate()} ไม่มี
     * timeout (connect/read = 0 คือรอไม่จำกัด) — ถ้า LINE Messaging API
     * (getUserProfile/reply/push) ช้าหรือค้าง จะกิน thread ใน
     * {@code lineWebhookExecutor} ไปเรื่อย ๆ จนพูลเต็ม ทำให้ทุก event ถัดไป
     * ต้องรอ ดูเหมือน "AI service ช้า" ทั้งที่จริงคอขวดอยู่ก่อนเรียก ai-service
     */
    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(10_000);
        return new RestTemplate(factory);
    }
}