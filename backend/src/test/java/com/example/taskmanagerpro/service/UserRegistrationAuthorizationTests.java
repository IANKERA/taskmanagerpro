package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.Role;
import com.example.taskmanagerpro.repository.UserRepository;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserRegistrationAuthorizationTests {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    @Test
    void registrationAlwaysStoresAnEncodedPasswordAndRegularUserRole() {
        when(userRepository.findByUsername("new-user")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Password123!")).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(42L);
            return saved;
        });

        User registered = userService.registerUser("new-user", "Password123!");

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals(42L, registered.getId());
        assertEquals("new-user", userCaptor.getValue().getUsername());
        assertEquals(Role.ROLE_USER, userCaptor.getValue().getRole());
        assertEquals("encoded-password", userCaptor.getValue().getPassword());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "weak",
            "password123!",
            "PASSWORD123!",
            "Password!!!",
            "Password123"
    })
    void registrationRejectsPasswordsThatFailTheExistingStrengthPolicy(String password) {
        assertThrows(IllegalArgumentException.class,
                () -> userService.registerUser("new-user", password));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void registrationRejectsBlankUsernamesAndPasswordsBeforeSaving() {
        assertThrows(IllegalArgumentException.class,
                () -> userService.registerUser("  ", "Password123!"));
        assertThrows(IllegalArgumentException.class,
                () -> userService.registerUser("new-user", "  "));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void duplicateUsernameReturnsConflictWithoutEncodingOrSaving() {
        when(userRepository.findByUsername("existing"))
                .thenReturn(Optional.of(new User()));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> userService.registerUser("existing", "Password123!"));

        assertEquals(409, exception.getStatusCode().value());
        verify(passwordEncoder, never()).encode(any());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void persistenceFailureIsPropagatedAndNotConvertedToValidationFailure() {
        DataAccessResourceFailureException databaseFailure =
                new DataAccessResourceFailureException("database unavailable");
        when(userRepository.findByUsername("new-user")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Password123!")).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenThrow(databaseFailure);

        DataAccessResourceFailureException thrown = assertThrows(
                DataAccessResourceFailureException.class,
                () -> userService.registerUser("new-user", "Password123!"));

        assertEquals(databaseFailure, thrown);
    }

    @Test
    void authenticationRequestRequiresNonblankUsernameAndPassword() {
        var validator = Validation.buildDefaultValidatorFactory().getValidator();
        var request = new com.example.taskmanagerpro.dto.AuthRequest(" ", "");

        Set<String> invalidProperties = validator.validate(request).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(java.util.stream.Collectors.toSet());

        assertEquals(Set.of("username", "password"), invalidProperties);
        assertTrue(validator.validate(new com.example.taskmanagerpro.dto.AuthRequest(
                "new-user", "Password123!")).isEmpty());
    }
}
