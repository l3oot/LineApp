package com.example.demo.service;

import java.time.LocalDate;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import com.example.demo.dto.res.CoinEarnResult;
import com.example.demo.dto.res.CoinWalletRes;
import com.example.demo.entity.CoinRuleEntity;
import com.example.demo.entity.CoinTransactionEntity;
import com.example.demo.entity.CoinWalletEntity;
import com.example.demo.enums.CoinRuleCode;
import com.example.demo.enums.CoinTransactionType;
import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;
import com.example.demo.repository.CoinRuleRepository;
import com.example.demo.repository.CoinTransactionRepository;
import com.example.demo.repository.CoinWalletRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.AppTime;

@Service
public class CoinService {

    public static final String REFERENCE_TYPE_TRANSACTION = "TRANSACTION";

    private static final Logger log = LoggerFactory.getLogger(CoinService.class);

    private final CoinRuleRepository coinRuleRepository;
    private final CoinTransactionRepository coinTransactionRepository;
    private final CoinWalletRepository coinWalletRepository;
    private final UserRepository userRepository;
    private final TransactionTemplate requiresNewTx;

    public CoinService(
            CoinRuleRepository coinRuleRepository,
            CoinTransactionRepository coinTransactionRepository,
            CoinWalletRepository coinWalletRepository,
            UserRepository userRepository,
            PlatformTransactionManager transactionManager) {
        this.coinRuleRepository = coinRuleRepository;
        this.coinTransactionRepository = coinTransactionRepository;
        this.coinWalletRepository = coinWalletRepository;
        this.userRepository = userRepository;
        this.requiresNewTx = new TransactionTemplate(transactionManager);
        this.requiresNewTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Transactional(readOnly = true)
    public CoinWalletRes getWallet(UUID userId) {
        if (userId == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
        if (!userRepository.existsById(userId)) {
            throw new ApiException(ErrorCode.USER_NOT_FOUND, "User not found");
        }
        return new CoinWalletRes(userId, currentBalance(userId));
    }

    /**
     * ให้ Coin จากกฎ RECORD วันละครั้ง ตามวันที่บันทึก (Asia/Bangkok).
     * ใช้ธุรกรรมแยก เพื่อไม่ให้ unique violation ย้อนรายการรายรับรายจ่าย
     */
    public CoinEarnResult tryAwardDailyRecord(UUID userId, UUID txId) {
        try {
            return requiresNewTx.execute(status -> awardDailyRecord(userId, txId));
        } catch (RuntimeException e) {
            if (!isUniqueViolation(e)) {
                throw e;
            }
            log.debug("daily RECORD coin already awarded: userId={} txId={}", userId, txId);
            return CoinEarnResult.none(currentBalance(userId));
        }
    }

    private CoinEarnResult awardDailyRecord(UUID userId, UUID txId) {
        CoinRuleEntity rule = coinRuleRepository.findByCodeAndActiveTrue(CoinRuleCode.RECORD).orElse(null);
        if (rule == null || rule.getCoinAmount() <= 0) {
            return CoinEarnResult.none(currentBalance(userId));
        }

        LocalDate earnDate = AppTime.today();
        if (coinTransactionRepository.existsByUserIdAndCoinRuleIdAndEarnDate(userId, rule.getCoinRuleId(), earnDate)) {
            return CoinEarnResult.none(currentBalance(userId));
        }

        int amount = rule.getCoinAmount();
        coinTransactionRepository.saveAndFlush(new CoinTransactionEntity(
                userId,
                rule.getCoinRuleId(),
                amount,
                CoinTransactionType.EARN,
                REFERENCE_TYPE_TRANSACTION,
                txId != null ? txId.toString() : null,
                "บันทึกรายการรายวัน",
                earnDate));

        CoinWalletEntity wallet = coinWalletRepository.findByUserIdForUpdate(userId)
                .orElseGet(() -> coinWalletRepository.save(new CoinWalletEntity(userId, 0)));
        wallet.setBalance(wallet.getBalance() + amount);
        coinWalletRepository.save(wallet);

        return new CoinEarnResult(amount, wallet.getBalance());
    }

    private int currentBalance(UUID userId) {
        return coinWalletRepository.findByUserId(userId)
                .map(CoinWalletEntity::getBalance)
                .orElse(0);
    }

    private static boolean isUniqueViolation(Throwable error) {
        Throwable current = error;
        while (current != null) {
            if (current instanceof DataIntegrityViolationException) {
                return true;
            }
            String message = current.getMessage();
            if (message != null && (message.contains("coin_transaction_user_rule_earn_date")
                    || message.contains("duplicate key"))) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
