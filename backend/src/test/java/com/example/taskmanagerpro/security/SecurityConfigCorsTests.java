package com.example.taskmanagerpro.security;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SecurityConfigCorsTests {

    @Test
    void corsUsesOnlyTheConfiguredExactOrigins() {
        SecurityConfig securityConfig = new SecurityConfig(null, null);
        ReflectionTestUtils.setField(securityConfig, "allowedOrigins",
                "https://frontend.example.test, http://localhost:5174");

        CorsConfigurationSource source = securityConfig.corsConfigurationSource();
        HttpServletRequest request = new MockHttpServletRequest("GET", "/api/tasks");
        CorsConfiguration cors = source.getCorsConfiguration(request);

        assertEquals(List.of("https://frontend.example.test", "http://localhost:5174"),
                cors.getAllowedOrigins());
        assertTrue(cors.getAllowCredentials());
        assertFalse(cors.getAllowedOrigins().contains("*"));
    }

    @Test
    void corsRejectsWildcardAndNonOriginValues() {
        assertThrows(IllegalStateException.class, () -> SecurityConfig.parseAllowedOrigins("*"));
        assertThrows(IllegalStateException.class,
                () -> SecurityConfig.parseAllowedOrigins("https://frontend.example.test/path"));
        assertThrows(IllegalStateException.class, () -> SecurityConfig.parseAllowedOrigins(" "));
    }
}
