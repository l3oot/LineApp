package com.example.demo.config;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * อนุญาต ai-service เรียก tool paths ด้วย {@code X-Internal-Api-Key}
 * เมื่อ key ตรงกับ {@code AI_INTERNAL_KEY} จะตั้ง ROLE_INTERNAL_AI ใน SecurityContext
 */
@Component
public class InternalApiKeyFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Internal-Api-Key";
    public static final String USER_ID_HEADER = "X-User-Id";

    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();

    /** Whitelist เฉพาะ path ที่ AI Gateway ใช้ (Phase 1) */
    private static final List<PathRule> ALLOWED = List.of(
            new PathRule(HttpMethod.GET, "/api/weather/forecast"),
            new PathRule(HttpMethod.GET, "/api/weather/forecast/daily"),
            new PathRule(HttpMethod.GET, "/api/weather/warning"),
            new PathRule(HttpMethod.GET, "/api/agri-prices/search"),
            new PathRule(HttpMethod.GET, "/api/agri-prices/product-names"),
            new PathRule(HttpMethod.GET, "/api/transaction"),
            new PathRule(HttpMethod.GET, "/api/transaction/user/**"),
            new PathRule(HttpMethod.GET, "/api/cycle/user/**"),
            new PathRule(HttpMethod.GET, "/api/cycle/{cycleId}"),
            new PathRule(HttpMethod.POST, "/api/cycle/{cycleId}/summarize"),
            new PathRule(HttpMethod.GET, "/api/category"),
            new PathRule(HttpMethod.GET, "/api/category/"));

    private final String internalApiKey;

    public InternalApiKeyFilter(@Value("${app.security.internal-api-key:}") String internalApiKey) {
        this.internalApiKey = internalApiKey == null ? "" : internalApiKey.trim();
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        if (internalApiKey.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }
        if (SecurityContextHolder.getContext().getAuthentication() != null
                && SecurityContextHolder.getContext().getAuthentication().isAuthenticated()) {
            filterChain.doFilter(request, response);
            return;
        }

        String provided = request.getHeader(HEADER);
        if (provided == null || provided.isBlank() || !internalApiKey.equals(provided.trim())) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!isAllowed(request.getMethod(), request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }

        String principal = request.getHeader(USER_ID_HEADER);
        if (principal == null || principal.isBlank()) {
            principal = "internal-ai";
        }
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        principal.trim(),
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_INTERNAL_AI")));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        filterChain.doFilter(request, response);
    }

    private static boolean isAllowed(String method, String uri) {
        String path = uri == null ? "" : uri;
        // strip context path quirks — app has none
        for (PathRule rule : ALLOWED) {
            if (!rule.method.name().equalsIgnoreCase(method)) {
                continue;
            }
            if (PATH_MATCHER.match(rule.pattern, path)) {
                return true;
            }
        }
        return false;
    }

    private record PathRule(HttpMethod method, String pattern) {
    }
}
