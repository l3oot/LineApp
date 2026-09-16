package com.example.demo.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.example.demo.entity.CoinRuleEntity;
import com.example.demo.enums.CoinRuleCode;
import com.example.demo.repository.CoinRuleRepository;

@Component
public class CoinBootstrap implements ApplicationRunner {

    private final CoinRuleRepository coinRuleRepository;

    public CoinBootstrap(CoinRuleRepository coinRuleRepository) {
        this.coinRuleRepository = coinRuleRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (coinRuleRepository.findByCode(CoinRuleCode.RECORD).isPresent()) {
            return;
        }
        coinRuleRepository.save(new CoinRuleEntity(
                CoinRuleCode.RECORD,
                "บันทึกรายการ",
                "บันทึกรายรับหรือรายจ่ายอย่างน้อย 1 รายการต่อวัน ได้ 1 Coin",
                1,
                1,
                true));
    }
}
