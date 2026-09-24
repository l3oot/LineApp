package com.example.demo.service;

import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Locale;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.example.demo.enums.ErrorCode;
import com.example.demo.exception.ApiException;

/**
 * Ensures product images are at most {@link #MAX_BYTES} (500 KB).
 * If larger, scales + JPEG-compresses; throws if still over limit.
 */
@Service
public class ProductImageService {

    public static final int MAX_BYTES = 500 * 1024;

    public record PreparedImage(byte[] bytes, String contentType, String extension) {
    }

    public PreparedImage prepare(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(ErrorCode.PRODUCT_IMAGE_REQUIRED, "ต้องแนบรูปสินค้าอย่างน้อย 1 รูป");
        }

        String contentType = normalizeContentType(file.getContentType(), file.getOriginalFilename());
        if (contentType == null) {
            throw new ApiException(ErrorCode.PRODUCT_IMAGE_INVALID, "รองรับเฉพาะไฟล์รูป JPG PNG หรือ WEBP");
        }

        byte[] original;
        try {
            original = file.getBytes();
        } catch (IOException ex) {
            throw new ApiException(ErrorCode.PRODUCT_IMAGE_INVALID, "อ่านไฟล์รูปไม่สำเร็จ");
        }

        if (original.length == 0) {
            throw new ApiException(ErrorCode.PRODUCT_IMAGE_REQUIRED, "ต้องแนบรูปสินค้าอย่างน้อย 1 รูป");
        }

        if (original.length <= MAX_BYTES) {
            return new PreparedImage(original, contentType, extensionFor(contentType));
        }

        try {
            byte[] resized = resizeUnderLimit(original);
            if (resized == null || resized.length == 0 || resized.length > MAX_BYTES) {
                throw new ApiException(
                        ErrorCode.PRODUCT_IMAGE_RESIZE_FAILED,
                        "รูปใหญ่เกิน 500 KB และย่อขนาดไม่สำเร็จ กรุณาเลือกรูปที่เล็กกว่า");
            }
            return new PreparedImage(resized, "image/jpeg", "jpg");
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException(
                    ErrorCode.PRODUCT_IMAGE_RESIZE_FAILED,
                    "รูปใหญ่เกิน 500 KB และย่อขนาดไม่สำเร็จ กรุณาเลือกรูปที่เล็กกว่า");
        }
    }

    private byte[] resizeUnderLimit(byte[] original) throws IOException {
        BufferedImage source = ImageIO.read(new ByteArrayInputStream(original));
        if (source == null) {
            throw new ApiException(ErrorCode.PRODUCT_IMAGE_INVALID, "ไฟล์รูปไม่ถูกต้อง");
        }

        int width = source.getWidth();
        int height = source.getHeight();
        float[] qualities = {0.85f, 0.7f, 0.55f, 0.4f, 0.3f};
        double[] scales = {1.0, 0.85, 0.7, 0.55, 0.4, 0.3, 0.2};

        for (double scale : scales) {
            int w = Math.max(1, (int) Math.round(width * scale));
            int h = Math.max(1, (int) Math.round(height * scale));
            BufferedImage scaled = scaleImage(source, w, h);
            for (float quality : qualities) {
                byte[] jpeg = encodeJpeg(scaled, quality);
                if (jpeg.length <= MAX_BYTES) {
                    return jpeg;
                }
            }
        }
        return null;
    }

    private static BufferedImage scaleImage(BufferedImage source, int width, int height) {
        Image tmp = source.getScaledInstance(width, height, Image.SCALE_SMOOTH);
        BufferedImage scaled = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = scaled.createGraphics();
        try {
            g.drawImage(tmp, 0, 0, null);
        } finally {
            g.dispose();
        }
        return scaled;
    }

    private static byte[] encodeJpeg(BufferedImage image, float quality) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
        if (!writers.hasNext()) {
            throw new IOException("No JPEG writer available");
        }
        ImageWriter writer = writers.next();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(baos)) {
            writer.setOutput(ios);
            ImageWriteParam param = writer.getDefaultWriteParam();
            if (param.canWriteCompressed()) {
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(quality);
            }
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
        return baos.toByteArray();
    }

    private static String normalizeContentType(String contentType, String filename) {
        String ct = contentType == null ? "" : contentType.trim().toLowerCase(Locale.ROOT);
        if (ct.contains("jpeg") || ct.equals("image/jpg")) {
            return "image/jpeg";
        }
        if (ct.equals("image/png")) {
            return "image/png";
        }
        if (ct.equals("image/webp")) {
            return "image/webp";
        }
        String name = filename == null ? "" : filename.toLowerCase(Locale.ROOT);
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (name.endsWith(".png")) {
            return "image/png";
        }
        if (name.endsWith(".webp")) {
            return "image/webp";
        }
        return null;
    }

    private static String extensionFor(String contentType) {
        return switch (contentType) {
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "jpg";
        };
    }
}
