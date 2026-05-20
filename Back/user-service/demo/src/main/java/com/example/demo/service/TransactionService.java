package com.example.demo.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.dto.ApiRes;
import com.example.demo.dto.req.TransactionCreateReq;
import com.example.demo.dto.req.TransactionUpdateReq;
import com.example.demo.dto.res.TransactionRes;
import com.example.demo.entity.CycleEntity;
import com.example.demo.entity.TransactionEntity;
import com.example.demo.enums.TypeError;
import com.example.demo.repository.CycleRepository;
import com.example.demo.repository.TransactionRepository;
import com.example.demo.repository.UserRepository;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final CycleRepository cycleRepository;

    public TransactionService(
            TransactionRepository transactionRepository,
            UserRepository userRepository,
            CycleRepository cycleRepository) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.cycleRepository = cycleRepository;
    }

    public ApiRes<List<TransactionRes>> listTransactions(UUID userId, UUID cycleId) {
        if (userId == null) {
            return ApiRes.failure("userId is required", TypeError.VALIDATION_ERROR);
        }
        List<TransactionEntity> rows = cycleId == null
                ? transactionRepository.findByUserIdOrderByTxDateDesc(userId)
                : transactionRepository.findByUserIdAndCycleIdOrderByTxDateDesc(userId, cycleId);
        return ApiRes.success(rows.stream().map(this::toRes).toList(), "OK");
    }

    public ApiRes<TransactionRes> getTransaction(UUID txId, UUID userId) {
        if (txId == null || userId == null) {
            return ApiRes.failure("txId and userId are required", TypeError.VALIDATION_ERROR);
        }
        Optional<TransactionEntity> opt = transactionRepository.findById(txId);
        if (opt.isEmpty()) {
            return ApiRes.failure("Transaction not found", TypeError.NOT_FOUND);
        }
        TransactionEntity e = opt.get();
        if (!e.getUserId().equals(userId)) {
            return ApiRes.failure("Forbidden", TypeError.FORBIDDEN);
        }
        return ApiRes.success(toRes(e), "OK");
    }

    public ApiRes<TransactionRes> createTransaction(TransactionCreateReq req) {
        ApiRes<Void> validation = validateCommonFields(req.userId(), req.txType(), req.amount(), req.txDate());
        if (validation != null) {
            return failureFrom(validation);
        }
        if (!userRepository.existsById(req.userId())) {
            return ApiRes.failure("User not found", TypeError.NOT_FOUND);
        }
        String normalizedType = normalizeTxType(req.txType()).orElseThrow();
        if (req.cycleId() != null && !cycleOwnedByUser(req.cycleId(), req.userId())) {
            return ApiRes.failure("Cycle not found or does not belong to user", TypeError.VALIDATION_ERROR);
        }

        TransactionEntity entity = new TransactionEntity(
                req.userId(),
                req.cycleId(),
                req.categoryId(),
                normalizedType,
                req.amount(),
                req.note(),
                req.txDate());
        TransactionEntity saved = transactionRepository.save(entity);
        return ApiRes.success(toRes(saved), "Insert Success");
    }

    public ApiRes<TransactionRes> updateTransaction(TransactionUpdateReq req) {
        if (req.txId() == null || req.userId() == null) {
            return ApiRes.failure("txId and userId are required", TypeError.VALIDATION_ERROR);
        }
        ApiRes<Void> validation = validateCommonFields(req.userId(), req.txType(), req.amount(), req.txDate());
        if (validation != null) {
            return failureFrom(validation);
        }
        Optional<TransactionEntity> opt = transactionRepository.findById(req.txId());
        if (opt.isEmpty()) {
            return ApiRes.failure("Transaction not found", TypeError.NOT_FOUND);
        }
        TransactionEntity entity = opt.get();
        if (!entity.getUserId().equals(req.userId())) {
            return ApiRes.failure("Forbidden", TypeError.FORBIDDEN);
        }
        String normalizedType = normalizeTxType(req.txType()).orElseThrow();
        if (req.cycleId() != null && !cycleOwnedByUser(req.cycleId(), req.userId())) {
            return ApiRes.failure("Cycle not found or does not belong to user", TypeError.VALIDATION_ERROR);
        }

        entity.setCycleId(req.cycleId());
        entity.setCategoryId(req.categoryId());
        entity.setTxType(normalizedType);
        entity.setAmount(req.amount());
        entity.setNote(req.note());
        entity.setTxDate(req.txDate());

        TransactionEntity saved = transactionRepository.save(entity);
        return ApiRes.success(toRes(saved), "Update Success");
    }

    public ApiRes<Void> deleteTransaction(UUID txId, UUID userId) {
        if (txId == null || userId == null) {
            return ApiRes.failure("txId and userId are required", TypeError.VALIDATION_ERROR);
        }
        Optional<TransactionEntity> opt = transactionRepository.findById(txId);
        if (opt.isEmpty()) {
            return ApiRes.failure("Transaction not found", TypeError.NOT_FOUND);
        }
        if (!opt.get().getUserId().equals(userId)) {
            return ApiRes.failure("Forbidden", TypeError.FORBIDDEN);
        }
        transactionRepository.deleteById(txId);
        return ApiRes.success(null, "Delete Success");
    }

    @Transactional
    public ApiRes<Void> deleteAllTransactionsByUser(UUID userId) {
        if (userId == null) {
            return ApiRes.failure("userId is required", TypeError.VALIDATION_ERROR);
        }
        if (!userRepository.existsById(userId)) {
            return ApiRes.failure("User not found", TypeError.NOT_FOUND);
        }
        transactionRepository.deleteByUserId(userId);
        return ApiRes.success(null, "Delete All Success");
    }

    private ApiRes<Void> validateCommonFields(UUID userId, String txType, BigDecimal amount, LocalDateTime txDate) {
        if (userId == null) {
            return ApiRes.failure("userId is required", TypeError.VALIDATION_ERROR);
        }
        if (txType == null || txType.isBlank()) {
            return ApiRes.failure("txType is required (income or expense)", TypeError.VALIDATION_ERROR);
        }
        if (normalizeTxType(txType).isEmpty()) {
            return ApiRes.failure("txType must be income or expense", TypeError.VALIDATION_ERROR);
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ApiRes.failure("amount must be greater than zero", TypeError.VALIDATION_ERROR);
        }
        if (txDate == null) {
            return ApiRes.failure("txDate is required", TypeError.VALIDATION_ERROR);
        }
        return null;
    }

    private static <T> ApiRes<T> failureFrom(ApiRes<?> v) {
        return ApiRes.failure(v.message(), v.typeError());
    }

    private Optional<String> normalizeTxType(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        String t = raw.trim().toLowerCase(Locale.ROOT);
        if ("income".equals(t) || "expense".equals(t)) {
            return Optional.of(t);
        }
        return Optional.empty();
    }

    private boolean cycleOwnedByUser(UUID cycleId, UUID userId) {
        Optional<CycleEntity> c = cycleRepository.findById(cycleId);
        return c.map(x -> x.getUserId().equals(userId)).orElse(false);
    }

    private TransactionRes toRes(TransactionEntity e) {
        return new TransactionRes(
                e.getTxId(),
                e.getUserId(),
                e.getCycleId(),
                e.getCategoryId(),
                e.getTxType(),
                e.getAmount(),
                e.getNote(),
                e.getTxDate(),
                e.getCreatedAt());
    }
}
