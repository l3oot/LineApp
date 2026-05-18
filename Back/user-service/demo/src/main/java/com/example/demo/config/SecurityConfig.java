package com.example.demo.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Spring Security config — 2 filter chains:
 *  1) /swagger-ui/**, /v3/api-docs/**  → require HTTP Basic (DOCS_USERNAME / DOCS_PASSWORD)
 *  2) ทุก endpoint อื่น                 → permitAll (frontend ใช้ JWT จาก /api/auth/line ในรอบถัดไปได้)
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
                "/swagger-ui/**",
                "/swagger-ui.html",
                "/v3/api-docs/**",
                "/api/docs/**"
            )
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth.anyRequest().hasRole("DOCS"))
            .httpBasic(Customizer.withDefaults());
        return http.build();
    }

    @Bean
    @Order(2)
    SecurityFilterChain appSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .anyRequest().permitAll());
        return http.build();
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
}
