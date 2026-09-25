package com.example.demo.service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.example.demo.config.LineProperties;
import com.example.demo.dto.res.TransactionRes;
import com.example.demo.entity.CategoryEntity;
import com.example.demo.entity.CycleEntity;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.CycleRepository;

/**
 * สร้าง Flex card รายการธุรกรรมสำหรับ Reply หลังแก้จาก LIFF (via liff.sendMessages)
 */
@Service
public class LineTransactionNotifyService {

    private static final Logger log = LoggerFactory.getLogger(LineTransactionNotifyService.class);

    private final CycleRepository cycleRepository;
    private final CategoryRepository categoryRepository;
    private final LineFlexMessageBuilder lineFlexMessageBuilder;
    private final LineMessagingService lineMessagingService;
    private final LineProperties lineProperties;

    public LineTransactionNotifyService(
            CycleRepository cycleRepository,
            CategoryRepository categoryRepository,
            LineFlexMessageBuilder lineFlexMessageBuilder,
            LineMessagingService lineMessagingService,
            LineProperties lineProperties) {
        this.cycleRepository = cycleRepository;
        this.categoryRepository = categoryRepository;
        this.lineFlexMessageBuilder = lineFlexMessageBuilder;
        this.lineMessagingService = lineMessagingService;
        this.lineProperties = lineProperties;
    }

    /** Reply Flex card หลังแก้ไขรายการ — ใช้ replyToken จาก webhook ของ liff.sendMessages */
    public void replyUpdatedTransactionCard(String replyToken, TransactionRes tx) {
        if (replyToken == null || replyToken.isBlank() || tx == null) {
            log.debug("skip updated flex reply: missing replyToken or tx");
            return;
        }

        String cycleName = resolveCycleName(tx.cycleId());
        String categoryName = resolveCategoryName(tx.categoryId());
        Map<String, Object> bubble = lineFlexMessageBuilder.buildUpdatedTransactionBubble(
                tx,
                cycleName,
                categoryName,
                lineProperties.resolveLiffBaseUrl());
        String altText = lineFlexMessageBuilder.buildUpdatedAltText(tx);

        lineMessagingService.replyFlex(replyToken, altText, bubble);
    }

    private String resolveCycleName(UUID cycleId) {
        if (cycleId == null) {
            return "-";
        }
        Optional<CycleEntity> cycle = cycleRepository.findById(cycleId);
        if (cycle.isEmpty() || cycle.get().getName() == null || cycle.get().getName().isBlank()) {
            return "-";
        }
        return cycle.get().getName();
    }

    private String resolveCategoryName(UUID categoryId) {
        if (categoryId == null) {
            return "-";
        }
        Optional<CategoryEntity> category = categoryRepository.findById(categoryId);
        if (category.isEmpty() || category.get().getName() == null || category.get().getName().isBlank()) {
            return "-";
        }
        return category.get().getName();
    }
}
