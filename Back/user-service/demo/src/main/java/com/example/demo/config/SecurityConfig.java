package com.example.demo.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.example.demo.dto.ApiRes;
import com.example.demo.enums.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletResponse;

/**
 * Spring Security config — 2 filter chains:
 *  1) Swagger/OpenAPI docs endpoints -> require HTTP Basic (DOCS_USERNAME / DOCS_PASSWORD)
 *  2) App APIs -> JWT (JwtAuthFilter) + authenticated ยกเว้น auth / webhook / health
 *     และ GET cycle/category ที่ ai-service เรียกโดยไม่มี JWT
 *
 * Override credentials ผ่าน env:
 *  DOCS_USERNAME=admin
 *  DOCS_PASSWORD=ChangeMe!
 *  APP_CORS_ALLOWED_ORIGINS=http://localhost:5173
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.security.docs-username:admin}")
    private String docsUsername;

    @Value("${app.security.docs-password:admin}")
    private String docsPassword;

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000,http://localhost:4173}")
    private String allowedOrigins;

    @Bean
    @Order(1)
    SecurityFilterChain docsSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher(
                "/api/docs",
                "/api/docs/**",
                "/swagger-ui/**",
                "/swagger-ui.html",
                "/v3/api-docs",
                "/v3/api-docs/**",
                "/v3/api-docs.yaml"
            )
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth.anyRequest().hasRole("DOCS"))
            .httpBasic(Customizer.withDefaults());
        return http.build();
    }

    @Bean
    @Order(2)
    SecurityFilterChain appSecurityFilterChain(
            HttpSecurity http,
            JwtAuthFilter jwtAuthFilter,
            ObjectMapper objectMapper) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/**", "/webhook", "/api/health", "/api/health/**").permitAll()
                // ai-service ดึง context ก่อน LLM โดยยังไม่ส่ง JWT
                .requestMatchers(HttpMethod.GET, "/api/cycle/user/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/crop/user/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/category", "/api/category/").permitAll()
                .anyRequest().authenticated())
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(jsonAuthenticationEntryPoint(objectMapper))
                .accessDeniedHandler(jsonAccessDeniedHandler(objectMapper)))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /**
     * ปิดการลงทะเบียน servlet filter อัตโนมัติ — ให้รันเฉพาะใน SecurityFilterChain
     */
    @Bean
    FilterRegistrationBean<JwtAuthFilter> jwtAuthFilterRegistration(JwtAuthFilter filter) {
        FilterRegistrationBean<JwtAuthFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    UserDetailsService docsUserDetailsService() {
        UserDetails admin = User.builder()
                .username(docsUsername)
                // {noop} = password ไม่ encrypt — เหมาะกับ dev/internal ใช้ env ป้องกัน checked-in
                .password("{noop}" + docsPassword)
                .roles("DOCS")
                .build();
        return new InMemoryUserDetailsManager(admin);
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        cfg.setAllowedOriginPatterns(origins);
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setExposedHeaders(List.of("Authorization"));
        cfg.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }

    private static AuthenticationEntryPoint jsonAuthenticationEntryPoint(ObjectMapper objectMapper) {
        return (request, response, authException) -> writeJsonError(
                response,
                objectMapper,
                ErrorCode.INVALID_CREDENTIAL,
                "Authentication required");
    }

    private static AccessDeniedHandler jsonAccessDeniedHandler(ObjectMapper objectMapper) {
        return (request, response, accessDeniedException) -> writeJsonError(
                response,
                objectMapper,
                ErrorCode.FORBIDDEN,
                "Forbidden");
    }

    private static void writeJsonError(
            HttpServletResponse response,
            ObjectMapper objectMapper,
            ErrorCode errorCode,
            String message) throws IOException {
        response.setStatus(errorCode.getHttpStatus().value());
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), ApiRes.failure(errorCode, message));
    }
}
