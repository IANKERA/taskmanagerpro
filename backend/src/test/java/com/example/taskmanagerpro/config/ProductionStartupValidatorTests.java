package com.example.taskmanagerpro.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProductionStartupValidatorTests {

    private static final String VALID_SECRET = "random-production-secret-value-over-32-bytes";

    @Test
    void acceptsExplicitProductionConfiguration() {
        assertDoesNotThrow(() -> ProductionStartupValidator.validate(productionEnvironment(Map.of())));
    }

    @Test
    void rejectsMissingJwtSecret() {
        MockEnvironment environment = productionEnvironment(Map.of("jwt.secret", "${JWT_SECRET}"));

        assertThrows(IllegalStateException.class,
                () -> ProductionStartupValidator.validate(environment));
    }

    @Test
    void rejectsUndersizedJwtSecret() {
        MockEnvironment environment = productionEnvironment(Map.of("jwt.secret", "too-short"));

        assertThrows(IllegalStateException.class,
                () -> ProductionStartupValidator.validate(environment));
    }

    @Test
    void rejectsKnownDevelopmentAndTestJwtSecrets() {
        for (String secret : new String[] {
                "dev-only-secret-change-me-in-production-please-32chars-min",
                "change-me-in-production-at-least-32-characters-long!",
                "taskmanagerpro-test-secret-not-for-production-123"
        }) {
            MockEnvironment environment = productionEnvironment(Map.of("jwt.secret", secret));

            assertThrows(IllegalStateException.class,
                    () -> ProductionStartupValidator.validate(environment));
        }
    }

    @Test
    void rejectsHibernateUpdateOverride() {
        MockEnvironment environment = productionEnvironment(
                Map.of("spring.jpa.hibernate.ddl-auto", "update"));

        assertThrows(IllegalStateException.class,
                () -> ProductionStartupValidator.validate(environment));
    }

    @Test
    void rejectsHibernateUpdateFromStandardEnvironmentOverride() {
        MockEnvironment environment = productionEnvironment(Map.of());
        environment.getPropertySources().addFirst(new SystemEnvironmentPropertySource(
                "testEnvironment", Map.of("SPRING_JPA_HIBERNATE_DDL_AUTO", "update")));

        assertThrows(IllegalStateException.class,
                () -> ProductionStartupValidator.validate(environment));
    }

    @Test
    void acceptsStandardDatasourceEnvironmentOverrides() {
        MockEnvironment environment = productionEnvironment(Map.of(
                "spring.datasource.url", "jdbc:postgresql://127.0.0.1:5432/taskdb"));
        environment.getPropertySources().addFirst(new SystemEnvironmentPropertySource(
                "testEnvironment", Map.of(
                        "SPRING_DATASOURCE_URL", "jdbc:postgresql://db.example.invalid:5432/taskdb",
                        "SPRING_DATASOURCE_USERNAME", "service-user",
                        "SPRING_DATASOURCE_PASSWORD", "private-password-placeholder")));

        assertDoesNotThrow(() -> ProductionStartupValidator.validate(environment));
    }

    @Test
    void rejectsDisabledFlywayOverride() {
        MockEnvironment environment = productionEnvironment(Map.of("spring.flyway.enabled", "false"));

        assertThrows(IllegalStateException.class,
                () -> ProductionStartupValidator.validate(environment));
    }

    @Test
    void rejectsMissingDatasourceConfiguration() {
        MockEnvironment environment = productionEnvironment(Map.of(
                "spring.datasource.url", "",
                "spring.datasource.username", "",
                "spring.datasource.password", ""));

        assertThrows(IllegalStateException.class,
                () -> ProductionStartupValidator.validate(environment));
    }

    @Test
    void rejectsLoopbackDatasource() {
        MockEnvironment environment = productionEnvironment(
                Map.of("spring.datasource.url", "jdbc:postgresql://127.0.0.1:5432/taskdb"));

        assertThrows(IllegalStateException.class,
                () -> ProductionStartupValidator.validate(environment));
    }

    @Test
    void rejectsIpv6LoopbackDatasource() {
        MockEnvironment environment = productionEnvironment(
                Map.of("spring.datasource.url", "jdbc:postgresql://[::1]:5432/taskdb"));

        assertThrows(IllegalStateException.class,
                () -> ProductionStartupValidator.validate(environment));
    }

    @Test
    void rejectsDatasourceUrlWithoutDatabaseName() {
        MockEnvironment environment = productionEnvironment(
                Map.of("spring.datasource.url", "jdbc:postgresql://db.example.invalid:5432"));

        assertThrows(IllegalStateException.class,
                () -> ProductionStartupValidator.validate(environment));
    }

    @Test
    void rejectsDevelopmentProfileCombinedWithProduction() {
        MockEnvironment environment = productionEnvironment(Map.of());
        environment.setActiveProfiles("prod", "dev");

        assertThrows(IllegalStateException.class,
                () -> ProductionStartupValidator.validate(environment));
    }

    @Test
    void requiresStrictConfigurationWhenNoProfileIsActive() {
        MockEnvironment environment = new MockEnvironment();

        assertThrows(IllegalStateException.class,
                () -> ProductionStartupValidator.validate(environment));
    }

    @Test
    void rejectsDevelopmentFallbackWhenNoProfileIsActive() {
        MockEnvironment environment = productionEnvironment(Map.of(
                "jwt.secret", "dev-only-secret-change-me-in-production-please-32chars-min"));
        environment.setActiveProfiles();

        assertThrows(IllegalStateException.class,
                () -> ProductionStartupValidator.validate(environment));
    }

    @Test
    void allowsExplicitDevelopmentAndTestProfiles() {
        MockEnvironment dev = new MockEnvironment();
        dev.setActiveProfiles("dev");
        MockEnvironment test = new MockEnvironment();
        test.setActiveProfiles("test");

        assertDoesNotThrow(() -> ProductionStartupValidator.validate(dev));
        assertDoesNotThrow(() -> ProductionStartupValidator.validate(test));
    }

    private MockEnvironment productionEnvironment(Map<String, String> overrides) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        environment.setProperty("jwt.secret", VALID_SECRET);
        environment.setProperty("spring.jpa.hibernate.ddl-auto", "validate");
        environment.setProperty("spring.flyway.enabled", "true");
        environment.setProperty("spring.datasource.url", "jdbc:postgresql://db.example.invalid:5432/taskdb");
        environment.setProperty("spring.datasource.username", "service-user");
        environment.setProperty("spring.datasource.password", "private-password-placeholder");
        overrides.forEach(environment::setProperty);
        return environment;
    }
}
