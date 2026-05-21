package com.example.demo.service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.example.demo.config.LineProperties;

/**
 * ตรวจ signature ของ LINE webhook
 *
 * <p>LINE ส่ง header {@code x-line-signature} = Base64(HMAC-SHA256(channelSecret, rawRequestBody))
 * เราต้องคำนวณเอง แล้ว compare ในรูปแบบ constant-time
 */
@Service
public class LineSignatureService {

    private static final Logger log = LoggerFactory.getLogger(LineSignatureService.class);
    private static final String HMAC_ALGO = "HmacSHA256";

    private final LineProperties lineProperties;

    public LineSignatureService(LineProperties lineProperties) {
        this.lineProperties = lineProperties;
    }

    /**
     * @param rawBody raw body byte ของ POST จาก LINE — ต้องเป็น byte เดิม ไม่ผ่าน Jackson
     * @param signature header x-line-signature ของ request นั้น
     * @return true ถ้า signature ตรง
     */
    public boolean verify(byte[] rawBody, String signature) {
        String secret = lineProperties.getChannelSecret();
        if (secret == null || secret.isBlank()) {
            log.warn("LINE channel-secret ไม่ได้ตั้งค่า — skip signature verify (เปิดเฉพาะ dev เท่านั้น)");
            return true;
        }
        if (signature == null || signature.isBlank() || rawBody == null) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGO));
            byte[] expected = mac.doFinal(rawBody);
            String expectedB64 = Base64.getEncoder().encodeToString(expected);
            return constantTimeEquals(expectedB64, signature);
        } catch (Exception e) {
            log.error("verify LINE signature failed", e);
            return false;
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) {
            return false;
        }
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            diff |= a.charAt(i) ^ b.charAt(i);
        }
        return diff == 0;
    }
}
