package com.example.demo.service;

import java.io.IOException;
import java.io.InputStream;
import java.util.Comparator;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import com.example.demo.dto.res.ThaiAdminOptionRes;
import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;

@Service
public class ThaiAdminLocalService {

    private static final Logger log = LoggerFactory.getLogger(ThaiAdminLocalService.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private List<ProvinceRow> provinces = List.of();
    private List<DistrictRow> districts = List.of();
    private List<SubdistrictRow> subdistricts = List.of();

    @PostConstruct
    void loadData() {
        try {
            provinces = loadJson("thai-admin/provinces.json", new TypeReference<>() {});
            districts = loadJson("thai-admin/districts.json", new TypeReference<>() {});
            subdistricts = loadJson("thai-admin/subdistricts.json", new TypeReference<>() {});
        } catch (IOException ex) {
            log.error("Failed to load Thai admin JSON data", ex);
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "Failed to load Thai admin data");
        }
    }

    public List<ThaiAdminOptionRes> listProvinces() {
        return provinces.stream()
                .map(row -> new ThaiAdminOptionRes(formatCode(row.provinceCode()), row.provinceNameTh()))
                .sorted(Comparator.comparing(ThaiAdminOptionRes::name))
                .toList();
    }

    public List<ThaiAdminOptionRes> listDistricts(String provinceCode) {
        int province = parseCode(provinceCode, "provinceCode");
        return districts.stream()
                .filter(row -> row.provinceCode() == province)
                .map(row -> new ThaiAdminOptionRes(formatCode(row.districtCode()), row.districtNameTh()))
                .sorted(Comparator.comparing(ThaiAdminOptionRes::name))
                .toList();
    }

    public List<ThaiAdminOptionRes> listSubdistricts(String districtCode) {
        int district = parseCode(districtCode, "districtCode");
        return subdistricts.stream()
                .filter(row -> row.districtCode() == district)
                .map(row -> new ThaiAdminOptionRes(formatCode(row.subdistrictCode()), row.subdistrictNameTh()))
                .sorted(Comparator.comparing(ThaiAdminOptionRes::name))
                .toList();
    }

    private int parseCode(String raw, String fieldName) {
        if (raw == null || raw.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, fieldName + " is required");
        }
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException ex) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Invalid " + fieldName);
        }
    }

    private String formatCode(int code) {
        return String.valueOf(code);
    }

    private <T> T loadJson(String classpath, TypeReference<T> typeRef) throws IOException {
        ClassPathResource resource = new ClassPathResource(classpath);
        try (InputStream input = resource.getInputStream()) {
            return MAPPER.readValue(input, typeRef);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ProvinceRow(
            int id,
            int provinceCode,
            String provinceNameEn,
            String provinceNameTh) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record DistrictRow(
            int id,
            int provinceCode,
            int districtCode,
            String districtNameEn,
            String districtNameTh,
            int postalCode) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record SubdistrictRow(
            int id,
            int provinceCode,
            int districtCode,
            int subdistrictCode,
            String subdistrictNameEn,
            String subdistrictNameTh,
            int postalCode) {
    } 
}
