package com.example.demo.service;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.example.demo.config.HCodeProperties;
import com.example.demo.dto.res.ThaiAdminOptionRes;
import com.example.demo.exception.ApiException;

@Service
public class ThaiAdminService {

    private static final Logger log = LoggerFactory.getLogger(ThaiAdminService.class);

    private final HCodeProperties props;
    private final ThaiAdminLocalService localService;
    private final HCodeClientService hCodeClientService;

    public ThaiAdminService(
            HCodeProperties props,
            ThaiAdminLocalService localService,
            HCodeClientService hCodeClientService) {
        this.props = props;
        this.localService = localService;
        this.hCodeClientService = hCodeClientService;
    }

    public List<ThaiAdminOptionRes> listProvinces() {
        return listWithFallback(localService::listProvinces, hCodeClientService::listProvinces);
    }

    public List<ThaiAdminOptionRes> listDistricts(String provinceCode) {
        return listWithFallback(
                () -> localService.listDistricts(provinceCode),
                () -> hCodeClientService.listDistricts(provinceCode));
    }

    public List<ThaiAdminOptionRes> listSubdistricts(String districtCode) {
        return listWithFallback(
                () -> localService.listSubdistricts(districtCode),
                () -> hCodeClientService.listSubdistricts(districtCode));
    }

    private List<ThaiAdminOptionRes> listWithFallback(
            DataSupplier local,
            DataSupplier remote) {
        if (props.useRemoteData()) {
            try {
                return remote.get();
            } catch (ApiException ex) {
                log.warn("HCode API failed, falling back to local Thai admin data: {}", ex.getMessage());
            }
        }
        return local.get();
    }

    @FunctionalInterface
    private interface DataSupplier {
        List<ThaiAdminOptionRes> get();
    }
}
