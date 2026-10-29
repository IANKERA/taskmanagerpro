package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.AuthRequest;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.security.JwtService;
import com.example.taskmanagerpro.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerRegistrationTests {

    @Mock private UserService userService;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtService jwtService;

    private AuthController controller() {
        return new AuthController(userService, authenticationManager, jwtService);
    }

    @Test
    void successfulRegistrationReturnsSuccess() {
        AuthRequest request = new AuthRequest("new-user", "Password123!");
        org.mockito.Mockito.doNothing().when(userService).validateNewPassword("Password123!");
        when(userService.registerUser("new-user", "Password123!")).thenReturn(new User());

        assertEquals(HttpStatus.OK, controller().register(request).getStatusCode());
        verify(userService).registerUser("new-user", "Password123!");
    }

    @Test
    void passwordPolicyFailureReturnsMeaningfulBadRequestBody() {
        org.mockito.Mockito.doThrow(new IllegalArgumentException("Password too weak"))
                .when(userService).validateNewPassword("weak");

        ResponseEntity<?> response = controller().register(new AuthRequest("new-user", "weak"));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Password too weak", ((java.util.Map<?, ?>) response.getBody()).get("message"));
        verify(userService, org.mockito.Mockito.never()).registerUser("new-user", "weak");
    }

    @Test
    void duplicateUsernameConflictIsPreserved() {
        ResponseStatusException conflict =
                new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken");
        when(userService.registerUser("existing", "Password123!")).thenThrow(conflict);

        ResponseStatusException thrown = assertThrows(ResponseStatusException.class,
                () -> controller().register(new AuthRequest("existing", "Password123!")));

        assertSame(conflict, thrown);
        assertEquals(HttpStatus.CONFLICT, thrown.getStatusCode());
    }

    @Test
    void persistenceFailureIsNotReportedAsClientError() {
        DataAccessResourceFailureException databaseFailure =
                new DataAccessResourceFailureException("database unavailable");
        when(userService.registerUser("new-user", "Password123!")).thenThrow(databaseFailure);

        DataAccessResourceFailureException thrown = assertThrows(
                DataAccessResourceFailureException.class,
                () -> controller().register(new AuthRequest("new-user", "Password123!")));

        assertSame(databaseFailure, thrown);
    }
}
