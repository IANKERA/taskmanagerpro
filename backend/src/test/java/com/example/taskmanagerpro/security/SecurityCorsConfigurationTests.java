package com.example.taskmanagerpro.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.cors.CorsConfigurationSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

class SecurityCorsConfigurationTests {

    private static final String FRONTEND_ORIGIN =
            "https://taskmanagerpro-1-9p8r.onrender.com";

    private final CorsConfigurationSource corsConfigurationSource =
            new SecurityConfig(null, null).corsConfigurationSource();

    @ParameterizedTest
    @ValueSource(strings = {
            FRONTEND_ORIGIN,
            "http://localhost:5174"
    })
    void acceptsRegistrationPreflightFromConfiguredOrigins(String origin) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(
                "OPTIONS", "/api/auth/register");
        request.addHeader("Origin", origin);
        request.addHeader("Access-Control-Request-Method", "POST");
        request.addHeader("Access-Control-Request-Headers", "authorization,content-type");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = (ServletRequest req, ServletResponse res) ->
                fail("CORS preflight should not reach downstream filters");

        new CorsFilter(corsConfigurationSource).doFilter(request, response, chain);

        assertEquals(200, response.getStatus());
        assertEquals(origin, response.getHeader("Access-Control-Allow-Origin"));
        assertEquals("true", response.getHeader("Access-Control-Allow-Credentials"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            FRONTEND_ORIGIN,
            "http://localhost:5174"
    })
    void acceptsLoginPreflightFromConfiguredOrigins(String origin) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(
                "OPTIONS", "/api/auth/login");
        request.addHeader("Origin", origin);
        request.addHeader("Access-Control-Request-Method", "POST");
        request.addHeader("Access-Control-Request-Headers", "authorization,content-type");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = (ServletRequest req, ServletResponse res) ->
                fail("CORS preflight should not reach downstream filters");

        new CorsFilter(corsConfigurationSource).doFilter(request, response, chain);

        assertEquals(200, response.getStatus());
        assertEquals(origin, response.getHeader("Access-Control-Allow-Origin"));
        assertEquals("true", response.getHeader("Access-Control-Allow-Credentials"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "http://localhost:5173",
            "https://unlisted.example"
    })
    void rejectsUnlistedOrigins(String origin) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(
                "OPTIONS", "/api/auth/register");
        request.addHeader("Origin", origin);
        request.addHeader("Access-Control-Request-Method", "POST");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = (ServletRequest req, ServletResponse res) ->
                fail("Rejected CORS preflight should not reach downstream filters");

        new CorsFilter(corsConfigurationSource).doFilter(request, response, chain);

        assertEquals(403, response.getStatus());
        assertEquals(null, response.getHeader("Access-Control-Allow-Origin"));
    }

    @Test
    void jwtFilterSkipsOptionsRequests() {
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(null, null);
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/projects");

        assertTrue(filter.shouldNotFilter(request));
    }
}
