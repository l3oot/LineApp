package com.example.demo.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.dto.req.TransactionCreateReq;
import com.example.demo.dto.req.TransactionUpdateReq;
import com.example.demo.dto.res.PageRes;
import com.example.demo.dto.res.TransactionRes;
import com.example.demo.entity.CycleEntity;
import com.example.demo.entity.TransactionEntity;
import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;
import com.example.demo.repository.CycleRepository;
import com.example.demo.repository.TransactionRepository;
import com.example.demo.repository.UserRepository;

@Service
public class TransactionService {

    public static final int DEFAULT_PAGE_SIZE = 10;
    public static final int MAX_PAGE_SIZE = 100;

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

    public List<TransactionRes> listTransactions(UUID userId, UUID cycleId) {
        if (userId == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
        List<TransactionEntity> rows = cycleId == null
                ? transactionRepository.findByUserIdOrderByTxDateDesc(userId)
                : transactionRepository.findByUserIdAndCycleIdOrderByTxDateDesc(userId, cycleId);
        return rows.stream().map(this::toRes).toList();
    }

    public PageRes<TransactionRes> listTransactionsByUserPage(
            UUID userId,
            UUID cycleId,
            LocalDateTime startDate,
            LocalDateTime endDate,
            int page,
            int size) {
        if (userId == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(safePage, safeSize);
        boolean hasDateRange = startDate != null && endDate != null;
        Page<TransactionEntity> result;
        if (hasDateRange) {
            LocalDateTime rangeStart = startDate;
            LocalDateTime rangeEnd = endDate;
            if (rangeStart.isAfter(rangeEnd)) {
                LocalDateTime tmp = rangeStart;
                rangeStart = rangeEnd;
                rangeEnd = tmp;
            }
            result = cycleId == null
                    ? transactionRepository.findByUserIdAndTxDateBetweenOrderByTxDateDesc(
                            userId, rangeStart, rangeEnd, pageable)
                    : transactionRepository.findByUserIdAndCycleIdAndTxDateBetweenOrderByTxDateDesc(
                            userId, cycleId, rangeStart, rangeEnd, pageable);
        } else {
            result = cycleId == null
                    ? transactionRepository.findByUserIdOrderByTxDateDesc(userId, pageable)
                    : transactionRepository.findByUserIdAndCycleIdOrderByTxDateDesc(userId, cycleId, pageable);
        }
        return toPageRes(result);
    }

    private PageRes<TransactionRes> toPageRes(Page<TransactionEntity> result) {
        return new PageRes<>(
                result.getContent().stream().map(this::toRes).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.hasNext());
    }

    public TransactionRes getTransaction(UUID txId, UUID userId) {
        if (txId == null || userId == null) {
            throw new ApiException(ErrorCode.TX_ID_USER_ID_REQUIRED, "txId and userId are required");
        }
        TransactionEntity entity = transactionRepository.findById(txId)
                .orElseThrow(() -> new ApiException(ErrorCode.TRANSACTION_NOT_FOUND, "Transaction not found"));
        if (!entity.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
        }
        return toRes(entity);
    }

    public TransactionRes createTransaction(TransactionCreateReq req) {
        validateCommonFields(req.userId(), req.txType(), req.amount(), req.txDate());
        if (!userRepository.existsById(req.userId())) {
            throw new ApiException(ErrorCode.USER_NOT_FOUND, "User not found");
        }
        String normalizedType = normalizeTxType(req.txType()).orElseThrow();
        if (req.cycleId() != null && !cycleOwnedByUser(req.cycleId(), req.userId())) {
            throw new ApiException(ErrorCode.CYCLE_NOT_OWNED, "Cycle not found or does not belong to user");
        }

        TransactionEntity entity = new TransactionEntity(
                req.userId(),
                req.cycleId(),
                req.categoryId(),
                normalizedType,
                req.amount(),
                req.note(),
                req.icon(),
                req.txDate());
        return toRes(transactionRepository.save(entity));
    }

    public TransactionRes updateTransaction(TransactionUpdateReq req) {
        if (req.txId() == null || req.userId() == null) {
            throw new ApiException(ErrorCode.TX_ID_USER_ID_REQUIRED, "txId and userId are required");
        }
        validateCommonFields(req.userId(), req.txType(), req.amount(), req.txDate());

        TransactionEntity entity = transactionRepository.findById(req.txId())
                .orElseThrow(() -> new ApiException(ErrorCode.TRANSACTION_NOT_FOUND, "Transaction not found"));
        if (!entity.getUserId().equals(req.userId())) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
        }
        String normalizedType = normalizeTxType(req.txType()).orElseThrow();
        if (req.cycleId() != null && !cycleOwnedByUser(req.cycleId(), req.userId())) {
            throw new ApiException(ErrorCode.CYCLE_NOT_OWNED, "Cycle not found or does not belong to user");
        }

        entity.setCycleId(req.cycleId());
        entity.setCategoryId(req.categoryId());
        entity.setTxType(normalizedType);
        entity.setAmount(req.amount());
        entity.setNote(req.note());
        entity.setIcon(req.icon());
        entity.setTxDate(req.txDate());

        return toRes(transactionRepository.save(entity));
    }

    public void deleteTransaction(UUID txId, UUID userId) {
        if (txId == null || userId == null) {
            throw new ApiException(ErrorCode.TX_ID_USER_ID_REQUIRED, "txId and userId are required");
        }
        TransactionEntity entity = transactionRepository.findById(txId)
                .orElseThrow(() -> new ApiException(ErrorCode.TRANSACTION_NOT_FOUND, "Transaction not found"));
        if (!entity.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
        }
        transactionRepository.deleteById(txId);
    }

    @Transactional
    public void deleteAllTransactionsByUser(UUID userId) {
        if (userId == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
        if (!userRepository.existsById(userId)) {
            throw new ApiException(ErrorCode.USER_NOT_FOUND, "User not found");
        }
        transactionRepository.deleteByUserId(userId);
    }

    private void validateCommonFields(UUID userId, String txType, BigDecimal amount, LocalDateTime txDate) {
        if (userId == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
        if (txType == null || txType.isBlank()) {
            throw new ApiException(ErrorCode.TX_TYPE_REQUIRED, "txType is required (income or expense)");
        }
        if (normalizeTxType(txType).isEmpty()) {
            throw new ApiException(ErrorCode.TX_TYPE_INVALID, "txType must be income or expense");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(ErrorCode.AMOUNT_INVALID, "amount must be greater than zero");
        }
        if (txDate == null) {
            throw new ApiException(ErrorCode.TX_DATE_REQUIRED, "txDate is required");
        }
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
                e.getIcon(),
                e.getTxDate(),
                e.getCreatedAt());
    }
}
