package com.example.demo.config;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.example.demo.util.AiLatency;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * จับเวลา HTTP ที่เข้า user-service — โดยเฉพาะตอน ai-service ยิงกลับมาที่ cycle/category
 */
@Component
public class AiLatencyFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(AiLatencyFilter.class);

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!shouldTrack(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String incoming = request.getHeader(AiLatency.HEADER);
        String reqId = incoming == null || incoming.isBlank() ? AiLatency.newRequestId() : incoming.trim();
        AiLatency.set(reqId);
        long t0 = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            log.info(
                    "[ai-latency] hop=user reqId={} action=http method={} path={} query={} status={} elapsedMs={}",
                    reqId,
                    request.getMethod(),
                    path,
                    request.getQueryString(),
                    response.getStatus(),
                    System.currentTimeMillis() - t0);
            AiLatency.clear();
        }
    }

    private static boolean shouldTrack(String path) {
        return "/webhook".equals(path)
                || path.startsWith("/api/cycle")
                || path.startsWith("/api/category");
    }
}
