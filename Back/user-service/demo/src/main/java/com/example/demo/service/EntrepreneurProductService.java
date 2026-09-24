package com.example.demo.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.example.demo.dto.res.EntrepreneurProductRes;
import com.example.demo.entity.EntrepreneurProductEntity;
import com.example.demo.entity.ProductTypeEntity;
import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;
import com.example.demo.repository.EntrepreneurProductRepository;
import com.example.demo.repository.ProductTypeRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.ProductImageService.PreparedImage;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class EntrepreneurProductService {

    private static final int PROPERTIES_MAX = 200;
    private static final int ADDRESS_MAX = 100;
    private static final int PHONE_MAX = 10;
    private static final int MAX_IMAGES = EntrepreneurProductEntity.MAX_IMAGES;

    private final EntrepreneurProductRepository productRepository;
    private final ProductTypeRepository productTypeRepository;
    private final UserRepository userRepository;
    private final ProductImageService productImageService;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;

    public EntrepreneurProductService(
            EntrepreneurProductRepository productRepository,
            ProductTypeRepository productTypeRepository,
            UserRepository userRepository,
            ProductImageService productImageService,
            FileStorageService fileStorageService,
            ObjectMapper objectMapper) {
        this.productRepository = productRepository;
        this.productTypeRepository = productTypeRepository;
        this.userRepository = userRepository;
        this.productImageService = productImageService;
        this.fileStorageService = fileStorageService;
        this.objectMapper = objectMapper;
    }

    public List<EntrepreneurProductRes> listMine(UUID userId) {
        requireUserId(userId);
        List<EntrepreneurProductEntity> products =
                productRepository.findByUserIdOrderByCreatedAtDesc(userId);
        Map<UUID, ProductTypeEntity> types = loadTypes(products);
        return products.stream().map(e -> toRes(e, types)).toList();
    }

    public List<EntrepreneurProductRes> listAll() {
        List<EntrepreneurProductEntity> products = productRepository.findAllByOrderByCreatedAtDesc();
        Map<UUID, ProductTypeEntity> types = loadTypes(products);
        return products.stream().map(e -> toRes(e, types)).toList();
    }

    public EntrepreneurProductRes get(UUID productId, UUID userId) {
        if (productId == null || userId == null) {
            throw new ApiException(ErrorCode.PRODUCT_ID_USER_ID_REQUIRED, "productId and userId are required");
        }
        EntrepreneurProductEntity entity = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException(ErrorCode.PRODUCT_NOT_FOUND, "ไม่พบสินค้า"));
        if (!entity.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
        }
        return toRes(entity, loadTypes(List.of(entity)));
    }

    public EntrepreneurProductRes create(
            UUID userId,
            UUID productTypeId,
            String name,
            String properties,
            String priceRaw,
            String address,
            String phone,
            String tiktok,
            String facebook,
            String lineId,
            MultipartFile[] images) {
        requireUserId(userId);
        if (!userRepository.existsById(userId)) {
            throw new ApiException(ErrorCode.USER_NOT_FOUND, "User not found");
        }

        ProductTypeEntity productType = requireProductType(productTypeId);
        String normalizedName = requireText(name, ErrorCode.PRODUCT_NAME_REQUIRED, "ต้องระบุชื่อสินค้า");
        String normalizedProperties = requireTextMax(
                properties,
                PROPERTIES_MAX,
                ErrorCode.PRODUCT_PROPERTIES_REQUIRED,
                ErrorCode.PRODUCT_PROPERTIES_TOO_LONG,
                "ต้องระบุสรรพคุณ",
                "สรรพคุณต้องไม่เกิน 200 ตัวอักษร");
        String normalizedAddress = requireTextMax(
                address,
                ADDRESS_MAX,
                ErrorCode.PRODUCT_ADDRESS_REQUIRED,
                ErrorCode.PRODUCT_ADDRESS_TOO_LONG,
                "ต้องระบุที่อยู่",
                "ที่อยู่ต้องไม่เกิน 100 ตัวอักษร");
        String normalizedPhone = requireTextMax(
                phone,
                PHONE_MAX,
                ErrorCode.PRODUCT_PHONE_REQUIRED,
                ErrorCode.PRODUCT_PHONE_TOO_LONG,
                "ต้องระบุเบอร์ติดต่อ",
                "เบอร์ติดต่อต้องไม่เกิน 10 ตัวอักษร");
        BigDecimal price = parsePrice(priceRaw);
        List<String> imagePaths = uploadImages(userId, images, List.of());

        EntrepreneurProductEntity saved = productRepository.save(
                new EntrepreneurProductEntity(
                        userId,
                        productType.getProductTypeId(),
                        normalizedName,
                        normalizedProperties,
                        price,
                        normalizedAddress,
                        normalizedPhone,
                        optionalText(tiktok),
                        optionalText(facebook),
                        optionalText(lineId),
                        imagePaths));
        return toRes(saved, Map.of(productType.getProductTypeId(), productType));
    }

    public EntrepreneurProductRes update(
            UUID productId,
            UUID userId,
            UUID productTypeId,
            String name,
            String properties,
            String priceRaw,
            String address,
            String phone,
            String tiktok,
            String facebook,
            String lineId,
            String keepImagePathsJson,
            MultipartFile[] images) {
        if (productId == null || userId == null) {
            throw new ApiException(ErrorCode.PRODUCT_ID_USER_ID_REQUIRED, "productId and userId are required");
        }
        EntrepreneurProductEntity entity = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException(ErrorCode.PRODUCT_NOT_FOUND, "ไม่พบสินค้า"));
        if (!entity.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
        }

        ProductTypeEntity productType = requireProductType(productTypeId);
        entity.setProductTypeId(productType.getProductTypeId());
        entity.setName(requireText(name, ErrorCode.PRODUCT_NAME_REQUIRED, "ต้องระบุชื่อสินค้า"));
        entity.setProperties(requireTextMax(
                properties,
                PROPERTIES_MAX,
                ErrorCode.PRODUCT_PROPERTIES_REQUIRED,
                ErrorCode.PRODUCT_PROPERTIES_TOO_LONG,
                "ต้องระบุสรรพคุณ",
                "สรรพคุณต้องไม่เกิน 200 ตัวอักษร"));
        entity.setAddress(requireTextMax(
                address,
                ADDRESS_MAX,
                ErrorCode.PRODUCT_ADDRESS_REQUIRED,
                ErrorCode.PRODUCT_ADDRESS_TOO_LONG,
                "ต้องระบุที่อยู่",
                "ที่อยู่ต้องไม่เกิน 100 ตัวอักษร"));
        entity.setPhone(requireTextMax(
                phone,
                PHONE_MAX,
                ErrorCode.PRODUCT_PHONE_REQUIRED,
                ErrorCode.PRODUCT_PHONE_TOO_LONG,
                "ต้องระบุเบอร์ติดต่อ",
                "เบอร์ติดต่อต้องไม่เกิน 10 ตัวอักษร"));
        entity.setTiktok(optionalText(tiktok));
        entity.setFacebook(optionalText(facebook));
        entity.setLineId(optionalText(lineId));
        entity.setPrice(parsePrice(priceRaw));

        List<String> previousPaths = normalizePaths(entity.getImagePaths());
        List<String> keepPaths = resolveKeepPaths(keepImagePathsJson, previousPaths);
        List<String> nextPaths = uploadImages(userId, images, keepPaths);

        LinkedHashSet<String> removed = new LinkedHashSet<>(previousPaths);
        removed.removeAll(nextPaths);
        for (String path : removed) {
            fileStorageService.deleteIfPresent(path);
        }

        entity.setImagePaths(nextPaths);
        EntrepreneurProductEntity saved = productRepository.save(entity);
        return toRes(saved, Map.of(productType.getProductTypeId(), productType));
    }

    public void delete(UUID productId, UUID userId) {
        if (productId == null || userId == null) {
            throw new ApiException(ErrorCode.PRODUCT_ID_USER_ID_REQUIRED, "productId and userId are required");
        }
        EntrepreneurProductEntity entity = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException(ErrorCode.PRODUCT_NOT_FOUND, "ไม่พบสินค้า"));
        if (!entity.getUserId().equals(userId)) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
        }
        List<String> imagePaths = normalizePaths(entity.getImagePaths());
        productRepository.deleteById(productId);
        for (String path : imagePaths) {
            fileStorageService.deleteIfPresent(path);
        }
    }

    private List<String> uploadImages(UUID userId, MultipartFile[] images, List<String> keepPaths) {
        List<String> paths = new ArrayList<>(keepPaths == null ? List.of() : keepPaths);
        List<MultipartFile> files = nonEmptyFiles(images);

        if (paths.isEmpty() && files.isEmpty()) {
            throw new ApiException(ErrorCode.PRODUCT_IMAGE_REQUIRED, "ต้องแนบรูปสินค้าอย่างน้อย 1 รูป");
        }
        if (paths.size() + files.size() > MAX_IMAGES) {
            throw new ApiException(
                    ErrorCode.PRODUCT_IMAGES_TOO_MANY,
                    "อัปโหลดรูปได้สูงสุด " + MAX_IMAGES + " รูป");
        }

        for (MultipartFile file : files) {
            PreparedImage prepared = productImageService.prepare(file);
            paths.add(fileStorageService.uploadProductImage(userId, prepared));
        }
        return paths;
    }

    private List<String> resolveKeepPaths(String keepImagePathsJson, List<String> previousPaths) {
        if (keepImagePathsJson == null || keepImagePathsJson.isBlank()) {
            return List.of();
        }
        try {
            List<String> requested = objectMapper.readValue(
                    keepImagePathsJson,
                    new TypeReference<List<String>>() {
                    });
            LinkedHashSet<String> allowed = new LinkedHashSet<>(previousPaths);
            List<String> kept = new ArrayList<>();
            for (String path : requested) {
                if (path == null || path.isBlank()) {
                    continue;
                }
                String trimmed = path.trim();
                if (allowed.contains(trimmed) && !kept.contains(trimmed)) {
                    kept.add(trimmed);
                }
            }
            if (kept.size() > MAX_IMAGES) {
                throw new ApiException(
                        ErrorCode.PRODUCT_IMAGES_TOO_MANY,
                        "อัปโหลดรูปได้สูงสุด " + MAX_IMAGES + " รูป");
            }
            return kept;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException(ErrorCode.PRODUCT_IMAGE_INVALID, "รายการรูปเดิมไม่ถูกต้อง");
        }
    }

    private static List<MultipartFile> nonEmptyFiles(MultipartFile[] images) {
        if (images == null || images.length == 0) {
            return List.of();
        }
        List<MultipartFile> files = new ArrayList<>();
        for (MultipartFile image : images) {
            if (image != null && !image.isEmpty()) {
                files.add(image);
            }
        }
        return files;
    }

    private static List<String> normalizePaths(List<String> paths) {
        if (paths == null || paths.isEmpty()) {
            return List.of();
        }
        return paths.stream()
                .filter(path -> path != null && !path.isBlank())
                .map(String::trim)
                .distinct()
                .toList();
    }

    private Map<UUID, ProductTypeEntity> loadTypes(List<EntrepreneurProductEntity> products) {
        List<UUID> ids = products.stream()
                .map(EntrepreneurProductEntity::getProductTypeId)
                .filter(id -> id != null)
                .distinct()
                .toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return productTypeRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(ProductTypeEntity::getProductTypeId, Function.identity()));
    }

    private ProductTypeEntity requireProductType(UUID productTypeId) {
        if (productTypeId == null) {
            throw new ApiException(ErrorCode.PRODUCT_TYPE_REQUIRED, "ต้องเลือกประเภทสินค้า");
        }
        return productTypeRepository.findById(productTypeId)
                .orElseThrow(() -> new ApiException(ErrorCode.PRODUCT_TYPE_NOT_FOUND, "ไม่พบประเภทสินค้า"));
    }

    private EntrepreneurProductRes toRes(
            EntrepreneurProductEntity e,
            Map<UUID, ProductTypeEntity> types) {
        ProductTypeEntity type = e.getProductTypeId() == null ? null : types.get(e.getProductTypeId());
        List<String> paths = normalizePaths(e.getImagePaths());
        List<String> urls = paths.stream()
                .map(fileStorageService::publicUrl)
                .filter(url -> url != null && !url.isBlank())
                .toList();
        return new EntrepreneurProductRes(
                e.getProductId(),
                e.getUserId(),
                e.getProductTypeId(),
                type != null ? type.getName() : null,
                e.getName(),
                e.getProperties(),
                e.getPrice(),
                e.getAddress(),
                e.getPhone(),
                e.getTiktok(),
                e.getFacebook(),
                e.getLineId(),
                paths,
                urls,
                urls.isEmpty() ? null : urls.get(0),
                e.getCreatedAt(),
                e.getUpdatedAt());
    }

    private static void requireUserId(UUID userId) {
        if (userId == null) {
            throw new ApiException(ErrorCode.USER_ID_REQUIRED, "userId is required");
        }
    }

    private static String requireText(String raw, ErrorCode code, String message) {
        if (raw == null) {
            throw new ApiException(code, message);
        }
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) {
            throw new ApiException(code, message);
        }
        return trimmed;
    }

    private static String requireTextMax(
            String raw,
            int maxLength,
            ErrorCode requiredCode,
            ErrorCode tooLongCode,
            String requiredMessage,
            String tooLongMessage) {
        String trimmed = requireText(raw, requiredCode, requiredMessage);
        if (trimmed.length() > maxLength) {
            throw new ApiException(tooLongCode, tooLongMessage);
        }
        return trimmed;
    }

    private static String optionalText(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static BigDecimal parsePrice(String priceRaw) {
        if (priceRaw == null || priceRaw.isBlank()) {
            throw new ApiException(ErrorCode.PRODUCT_PRICE_INVALID, "ต้องระบุราคา");
        }
        try {
            BigDecimal price = new BigDecimal(priceRaw.trim().replace(",", ""));
            if (price.compareTo(BigDecimal.ZERO) < 0) {
                throw new ApiException(ErrorCode.PRODUCT_PRICE_INVALID, "ราคาต้องไม่ติดลบ");
            }
            return price;
        } catch (NumberFormatException ex) {
            throw new ApiException(ErrorCode.PRODUCT_PRICE_INVALID, "รูปแบบราคาไม่ถูกต้อง");
        }
    }
}
