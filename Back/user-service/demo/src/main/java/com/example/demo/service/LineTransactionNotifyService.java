package com.example.demo.service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.example.demo.config.LineProperties;
import com.example.demo.dto.res.TransactionRes;
import com.example.demo.entity.CategoryEntity;
import com.example.demo.entity.CycleEntity;
import com.example.demo.entity.UserEntity;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.CycleRepository;
import com.example.demo.repository.UserRepository;

/**
 * Push Flex card กลับ LINE chat หลังผู้ใช้แก้ไขรายการในแอป
 */
@Service
public class LineTransactionNotifyService {

    private static final Logger log = LoggerFactory.getLogger(LineTransactionNotifyService.class);

    private final UserRepository userRepository;
    private final CycleRepository cycleRepository;
    private final CategoryRepository categoryRepository;
    private final LineFlexMessageBuilder lineFlexMessageBuilder;
    private final LineMessagingService lineMessagingService;
    private final LineProperties lineProperties;

    public LineTransactionNotifyService(
            UserRepository userRepository,
            CycleRepository cycleRepository,
            CategoryRepository categoryRepository,
            LineFlexMessageBuilder lineFlexMessageBuilder,
            LineMessagingService lineMessagingService,
            LineProperties lineProperties) {
        this.userRepository = userRepository;
        this.cycleRepository = cycleRepository;
        this.categoryRepository = categoryRepository;
        this.lineFlexMessageBuilder = lineFlexMessageBuilder;
        this.lineMessagingService = lineMessagingService;
        this.lineProperties = lineProperties;
    }

    @Async("lineWebhookExecutor")
    public void pushUpdatedTransactionCard(TransactionRes tx) {
        if (tx == null) {
            return;
        }

        Optional<UserEntity> userOpt = userRepository.findById(tx.userId());
        if (userOpt.isEmpty()) {
            log.debug("skip updated flex push: user not found userId={}", tx.userId());
            return;
        }

        String lineUserId = userOpt.get().getUserSub();
        if (lineUserId == null || lineUserId.isBlank()) {
            log.debug("skip updated flex push: no LINE userSub userId={}", tx.userId());
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

        lineMessagingService.pushFlex(lineUserId, altText, bubble);
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
