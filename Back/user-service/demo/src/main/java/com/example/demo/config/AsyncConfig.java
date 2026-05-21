package com.example.demo.config;

import java.util.concurrent.Executor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Executor สำหรับงาน webhook ที่ต้องทำหลัง response 200 — LINE บังคับให้ webhook
 * ตอบ 200 ภายในไม่กี่วินาที ไม่งั้นจะถูก retry (และ replyToken มีอายุ ~1 นาที)
 */
@Configuration
public class AsyncConfig {

    @Bean(name = "lineWebhookExecutor")
    public Executor lineWebhookExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(4);
        exec.setMaxPoolSize(16);
        exec.setQueueCapacity(100);
        exec.setThreadNamePrefix("line-webhook-");
        exec.initialize();
        return exec;
    }
}
