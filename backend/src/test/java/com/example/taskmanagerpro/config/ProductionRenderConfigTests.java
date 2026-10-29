package com.example.taskmanagerpro.config;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.MapPropertySource;
import org.springframework.mock.env.MockEnvironment;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ProductionRenderConfigTests {

    @Test
    void productionProfileUsesRenderPortAndSafeLocalDefault() throws IOException {
        Properties loaded = new Properties();
        try (InputStream input = getClass().getResourceAsStream("/application-prod.properties")) {
            if (input == null) {
                throw new IOException("application-prod.properties is missing from the test classpath");
            }
            loaded.load(input);
        }
        Map<String, Object> production = new HashMap<>();
        loaded.stringPropertyNames().forEach(key -> production.put(key, loaded.getProperty(key)));

        MockEnvironment local = new MockEnvironment();
        local.getPropertySources().addFirst(new MapPropertySource("production", production));
        assertEquals("8080", local.getProperty("server.port"));
        assertEquals("https://taskmanagerpro-1-9p8r.onrender.com,http://localhost:5174",
                local.getProperty("app.cors.allowed-origins"));

        MockEnvironment render = new MockEnvironment();
        render.getPropertySources().addFirst(new MapPropertySource("render-environment", Map.of(
                "PORT", "10000",
                "APP_CORS_ALLOWED_ORIGINS", "https://frontend.example.test"
        )));
        render.getPropertySources().addLast(new MapPropertySource("production", production));
        assertEquals("10000", render.getProperty("server.port"));
        assertEquals("https://frontend.example.test", render.getProperty("app.cors.allowed-origins"));
    }
}
