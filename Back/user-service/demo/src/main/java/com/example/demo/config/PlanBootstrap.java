package com.example.demo.config;

import java.math.BigDecimal;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.example.demo.entity.PlanEntity;
import com.example.demo.repository.PlanRepository;

@Component
public class PlanBootstrap implements ApplicationRunner {

    private final PlanRepository planRepository;

    public PlanBootstrap(PlanRepository planRepository) {
        this.planRepository = planRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (planRepository.count() == 0) {
            planRepository.save(new PlanEntity("free", 3, BigDecimal.ZERO, true, 20));
            planRepository.save(new PlanEntity("plus", 10, new BigDecimal("30.00"), true, 10));
            planRepository.save(new PlanEntity("pro", -1, new BigDecimal("99.00"), true, -1));
            return;
        }

        applyCategoryLimit("free", 20);
        applyCategoryLimit("plus", 10);
        applyCategoryLimit("pro", -1);
    }

    private void applyCategoryLimit(String name, int maxCategories) {
        planRepository.findByName(name).ifPresent(plan -> {
            if (plan.getMaxCategories() == null || plan.getMaxCategories() != maxCategories) {
                plan.setMaxCategories(maxCategories);
                planRepository.save(plan);
            }
        });
    }
}
