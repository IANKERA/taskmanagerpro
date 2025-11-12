package com.example.taskmanagerpro.integration;

import io.restassured.RestAssured;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.shadow.com.univocity.parsers.annotations.Nested;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;

import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test") // ensures H2 DB is used
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthControllerIntegrationTest {

    @LocalServerPort
    private int port;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
    }

    @org.junit.jupiter.api.Nested

    class RegisterEndpointTests {

        @Test
        @Order(1)
        @DisplayName("Should register new user successfully")
        void shouldRegisterUserSuccessfully() {
            String jsonBody = """
                {
                    "username": "KOSTAS",
                    "password": "pass123",
                    "role": "ROLE_USER"
                }
            """;

            given()
                    .contentType("application/json")
                    .body(jsonBody)
                    .when()
                    .post("/api/auth/register")
                    .then()
                    .statusCode(HttpStatus.OK.value())
                    .body("username", equalTo("KOSTAS"))
                    .body("role", equalTo("ROLE_USER"));
        }

        @Test
        @Order(2)
        @DisplayName("Should return 400 if username already exists")
        void shouldThrow400IfUserExist() {
            String jsonBody = """
                {
                    "username": "KOSTAS",
                    "password": "pass123",
                    "role": "ROLE_USER"
                }
            """;

            given()
                    .contentType("application/json")
                    .body(jsonBody)
                    .when()
                    .post("/api/auth/register")
                    .then()
                    .statusCode(HttpStatus.BAD_REQUEST.value())
                    .body("error", equalTo("Username already exists"));
        }

        @Test
        @Order(3)
        @DisplayName("Should return JWT token on valid login")
        void shouldReturnJwtTokenOnValidLogin() {
            String jsonBody = """
                {
                    "username": "KOSTAS",
                    "password": "pass123"
                }
            """;

            given()
                    .contentType("application/json")
                    .body(jsonBody)
                    .when()
                    .post("/api/auth/login")
                    .then()
                    .statusCode(HttpStatus.OK.value())
                    .body("token", notNullValue())
                    .body("token.length()", greaterThan(10));
        }

        @Test
        @Order(4)
        @DisplayName("Should fail login with wrong password")
        void shouldThrowInvalidUsernameOrPassword() {
            String jsonBody = """
                {
                    "username": "KOSTAS",
                    "password": "wrong123"
                }
            """;

            given()
                    .contentType("application/json")
                    .body(jsonBody)
                    .when()
                    .post("/api/auth/login")
                    .then()
                    .statusCode(HttpStatus.UNAUTHORIZED.value());
        }
    }
}