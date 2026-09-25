package com.example.demo.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "entrepreneur_product", schema = "public")
public class EntrepreneurProductEntity {

    public static final int MAX_IMAGES = 3;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "product_id")
    private UUID productId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "product_type_id", nullable = false)
    private UUID productTypeId;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "properties", nullable = false, length = 200)
    private String properties;

    @Column(name = "price", nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "address", nullable = false, length = 100)
    private String address;

    @Column(name = "phone", nullable = false, length = 10)
    private String phone;

    @Column(name = "tiktok", length = 500)
    private String tiktok;

    @Column(name = "facebook", length = 500)
    private String facebook;

    @Column(name = "line_id", length = 500)
    private String lineId;

    /** Storage paths inside Supabase bucket — 1 to 3 items. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "image_paths", nullable = false, columnDefinition = "jsonb")
    private List<String> imagePaths = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public EntrepreneurProductEntity() {
    }

    public EntrepreneurProductEntity(
            UUID userId,
            UUID productTypeId,
            String name,
            String properties,
            BigDecimal price,
            String address,
            String phone,
            String tiktok,
            String facebook,
            String lineId,
            List<String> imagePaths) {
        this.userId = userId;
        this.productTypeId = productTypeId;
        this.name = name;
        this.properties = properties;
        this.price = price;
        this.address = address;
        this.phone = phone;
        this.tiktok = tiktok;
        this.facebook = facebook;
        this.lineId = lineId;
        this.imagePaths = imagePaths == null ? new ArrayList<>() : new ArrayList<>(imagePaths);
    }

    public UUID getProductId() {
        return productId;
    }

    public void setProductId(UUID productId) {
        this.productId = productId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public UUID getProductTypeId() {
        return productTypeId;
    }

    public void setProductTypeId(UUID productTypeId) {
        this.productTypeId = productTypeId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getProperties() {
        return properties;
    }

    public void setProperties(String properties) {
        this.properties = properties;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getTiktok() {
        return tiktok;
    }

    public void setTiktok(String tiktok) {
        this.tiktok = tiktok;
    }

    public String getFacebook() {
        return facebook;
    }

    public void setFacebook(String facebook) {
        this.facebook = facebook;
    }

    public String getLineId() {
        return lineId;
    }

    public void setLineId(String lineId) {
        this.lineId = lineId;
    }

    public List<String> getImagePaths() {
        return imagePaths;
    }

    public void setImagePaths(List<String> imagePaths) {
        this.imagePaths = imagePaths == null ? new ArrayList<>() : new ArrayList<>(imagePaths);
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
