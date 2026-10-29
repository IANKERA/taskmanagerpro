package com.example.taskmanagerpro.config;

import org.springframework.core.env.Environment;

import java.net.URI;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;

public final class ProductionStartupValidator {

    private static final Set<String> DEVELOPMENT_JWT_SECRETS = Set.of(
            "dev-only-secret-change-me-in-production-please-32chars-min",
            "change-me-in-production-at-least-32-characters-long!",
            "taskmanagerpro-test-secret-not-for-production-123"
    );

    private ProductionStartupValidator() {
    }

    public static void validate(Environment environment) {
        Set<String> profiles = Arrays.stream(environment.getActiveProfiles())
                .map(profile -> profile.toLowerCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.toUnmodifiableSet());

        if (profiles.contains("dev") || profiles.contains("test")) {
            if (profiles.size() != 1) {
                throw new IllegalStateException(
                        "The dev and test profiles must not be combined with other profiles");
            }
            return;
        }

        String jwtSecret = required(environment, "jwt.secret", "JWT_SECRET");
        if (jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 bytes for HS256");
        }
        if (DEVELOPMENT_JWT_SECRETS.contains(jwtSecret)) {
            throw new IllegalStateException("A development or test JWT secret cannot be used outside dev/test");
        }

        String ddlAuto = required(environment, "spring.jpa.hibernate.ddl-auto",
                "SPRING_JPA_HIBERNATE_DDL_AUTO");
        if (!"validate".equalsIgnoreCase(ddlAuto)) {
            throw new IllegalStateException(
                    "Hibernate must use ddl-auto=validate outside the dev/test profiles");
        }

        String flywayEnabled = required(environment, "spring.flyway.enabled", "SPRING_FLYWAY_ENABLED");
        if (!Boolean.parseBoolean(flywayEnabled)) {
            throw new IllegalStateException("Flyway must be enabled outside the dev/test profiles");
        }

        String url = required(environment, "spring.datasource.url",
                "DB_HOST, DB_PORT, DB_NAME, or SPRING_DATASOURCE_URL");
        required(environment, "spring.datasource.username", "DB_USER or SPRING_DATASOURCE_USERNAME");
        required(environment, "spring.datasource.password", "DB_PASS or SPRING_DATASOURCE_PASSWORD");
        validateDatabaseUrl(url);
    }

    private static String required(Environment environment, String property, String variableNames) {
        final String value;
        try {
            value = environment.getProperty(property);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException(
                    "Required production configuration is missing: " + variableNames);
        }
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(
                    "Required production configuration is missing: " + variableNames);
        }
        return value;
    }

    private static void validateDatabaseUrl(String url) {
        if (!url.startsWith("jdbc:postgresql://")) {
            throw new IllegalStateException("Production datasource must use a PostgreSQL JDBC URL");
        }

        final URI databaseUri;
        try {
            databaseUri = URI.create(url.substring("jdbc:".length()));
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("Production datasource URL is invalid");
        }
        String host = databaseUri.getHost();
        String databasePath = databaseUri.getPath();
        if (host == null || databasePath == null || databasePath.length() <= 1) {
            throw new IllegalStateException(
                    "Production datasource URL must specify a database name");
        }
        if (isLocalHost(host)) {
            throw new IllegalStateException("Production datasource must not use a local database host");
        }
    }

    private static boolean isLocalHost(String host) {
        String normalized = host.toLowerCase(Locale.ROOT);
        if (normalized.startsWith("[") && normalized.endsWith("]")) {
            normalized = normalized.substring(1, normalized.length() - 1);
        }
        return normalized.equals("localhost")
                || normalized.endsWith(".localhost")
                || normalized.equals("host.docker.internal")
                || normalized.equals("::1")
                || normalized.equals("0:0:0:0:0:0:0:1")
                || normalized.equals("0.0.0.0")
                || normalized.matches("127(?:\\.\\d{1,3}){3}");
    }
}
