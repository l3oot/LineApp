package com.example.demo.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.example.demo.dto.res.ProductTypeRes;
import com.example.demo.repository.ProductTypeRepository;

@Service
public class ProductTypeService {

    private final ProductTypeRepository productTypeRepository;

    public ProductTypeService(ProductTypeRepository productTypeRepository) {
        this.productTypeRepository = productTypeRepository;
    }

    public List<ProductTypeRes> listAll() {
        return productTypeRepository.findAllByOrderBySortOrderAscNameAsc().stream()
                .map(e -> new ProductTypeRes(e.getProductTypeId(), e.getName(), e.getSortOrder()))
                .toList();
    }
}
