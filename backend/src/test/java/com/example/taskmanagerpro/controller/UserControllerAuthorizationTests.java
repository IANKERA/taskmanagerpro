package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.ChangePasswordRequest;
import com.example.taskmanagerpro.dto.UserDTO;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.Role;
import com.example.taskmanagerpro.security.JwtService;
import com.example.taskmanagerpro.service.NotificationService;
import com.example.taskmanagerpro.service.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserControllerAuthorizationTests {

    @Mock
    private UserService userService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private JwtService jwtService;

    private UserController userController;

    @BeforeEach
    void setUp() {
        userController = new UserController(userService, notificationService, jwtService);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "adminUser", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getAllUsersReturnsAllUsers() {
        User u1 = User.builder().id(1L).username("adminUser").role(Role.ROLE_ADMIN).build();
        User u2 = User.builder().id(2L).username("regularUser").role(Role.ROLE_USER).build();
        when(userService.getAllUsers()).thenReturn(List.of(u1, u2));

        List<UserDTO> result = userController.getAllUsers();

        assertEquals(2, result.size());
        assertEquals("adminUser", result.get(0).getUsername());
        assertEquals("regularUser", result.get(1).getUsername());
    }

    @Test
    void adminCannotDeleteOwnAccount() {
        User admin = User.builder().id(1L).username("adminUser").role(Role.ROLE_ADMIN).build();
        when(userService.getUserById(1L)).thenReturn(Optional.of(admin));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userController.deleteUser(1L));

        assertEquals(400, ex.getStatusCode().value());
        assertEquals("Cannot delete your own admin account", ex.getReason());
        verify(userService, never()).deleteUser(any());
    }

    @Test
    void adminCannotDeleteLastRemainingAdmin() {
        User otherAdmin = User.builder().id(2L).username("otherAdmin").role(Role.ROLE_ADMIN).build();
        when(userService.getUserById(2L)).thenReturn(Optional.of(otherAdmin));
        when(userService.countAdmins()).thenReturn(1L);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userController.deleteUser(2L));

        assertEquals(400, ex.getStatusCode().value());
        assertEquals("Cannot delete the only remaining admin", ex.getReason());
        verify(userService, never()).deleteUser(any());
    }

    @Test
    void adminCanDeleteOtherUserWhenMultipleAdminsExist() {
        User target = User.builder().id(3L).username("targetUser").role(Role.ROLE_USER).build();
        when(userService.getUserById(3L)).thenReturn(Optional.of(target));

        ResponseEntity<Void> response = userController.deleteUser(3L);

        assertEquals(204, response.getStatusCode().value());
        verify(userService).deleteUser(3L);
    }

    @Test
    void adminCannotRevokeOwnAdminRole() {
        User admin = User.builder().id(1L).username("adminUser").role(Role.ROLE_ADMIN).build();
        when(userService.getUserById(1L)).thenReturn(Optional.of(admin));

        User updateRequest = new User();
        updateRequest.setRole(Role.ROLE_USER);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userController.updateUser(1L, updateRequest));

        assertEquals(400, ex.getStatusCode().value());
        assertEquals("Cannot revoke your own admin role", ex.getReason());
        verify(userService, never()).saveUser(any());
    }

    @Test
    void updateUserRejectsTakenUsername() {
        User existing = User.builder().id(2L).username("bob").role(Role.ROLE_USER).build();
        when(userService.getUserById(2L)).thenReturn(Optional.of(existing));
        when(userService.existsByUsername("charlie")).thenReturn(true);

        User updateRequest = new User();
        updateRequest.setUsername("charlie");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userController.updateUser(2L, updateRequest));

        assertEquals(409, ex.getStatusCode().value());
        verify(userService, never()).saveUser(any());
    }

    @Test
    void adminCanUpdateUserRoleAndEmail() {
        User existing = User.builder().id(2L).username("bob").email("old@example.com").role(Role.ROLE_USER).build();
        when(userService.getUserById(2L)).thenReturn(Optional.of(existing));
        when(userService.saveUser(any())).thenAnswer(invocation -> invocation.getArgument(0));

        User updateRequest = new User();
        updateRequest.setEmail("new@example.com");
        updateRequest.setRole(Role.ROLE_ADMIN);

        ResponseEntity<UserDTO> response = userController.updateUser(2L, updateRequest);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("new@example.com", response.getBody().getEmail());
        assertEquals(Role.ROLE_ADMIN, response.getBody().getRole());
        verify(userService).saveUser(existing);
    }

    @Test
    void deleteUserReturnsConflictWhenReferentialIntegrityFails() {
        User target = User.builder().id(3L).username("targetUser").role(Role.ROLE_USER).build();
        when(userService.getUserById(3L)).thenReturn(Optional.of(target));
        doThrow(new org.springframework.dao.DataIntegrityViolationException("FK constraint"))
                .when(userService).deleteUser(3L);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userController.deleteUser(3L));

        assertEquals(409, ex.getStatusCode().value());
        assertEquals("Cannot delete user: user has associated issues or project records", ex.getReason());
    }

    @Test
    void changePasswordSuccessReturnsOkAndNewToken() {
        User user = User.builder().id(1L).username("adminUser").password("hashedOld").role(Role.ROLE_ADMIN).build();
        when(userService.getUserByUsername("adminUser")).thenReturn(Optional.of(user));
        when(userService.checkPassword(user, "OldPass123!")).thenReturn(true);
        when(jwtService.generateToken("adminUser")).thenReturn("new-jwt-token");

        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("OldPass123!")
                .newPassword("NewPass456!")
                .confirmPassword("NewPass456!")
                .build();

        ResponseEntity<?> response = userController.changePassword(request);

        assertEquals(200, response.getStatusCode().value());
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> body = (java.util.Map<String, Object>) response.getBody();
        assertEquals("Password updated successfully.", body.get("message"));
        assertEquals("new-jwt-token", body.get("token"));
        verify(userService).updatePassword(user, "NewPass456!");
    }

    @Test
    void changePasswordRejectsIncorrectCurrentPassword() {
        User user = User.builder().id(1L).username("adminUser").password("hashedOld").role(Role.ROLE_ADMIN).build();
        when(userService.getUserByUsername("adminUser")).thenReturn(Optional.of(user));
        when(userService.checkPassword(user, "WrongPass123!")).thenReturn(false);

        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("WrongPass123!")
                .newPassword("NewPass456!")
                .confirmPassword("NewPass456!")
                .build();

        ResponseEntity<?> response = userController.changePassword(request);

        assertEquals(400, response.getStatusCode().value());
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> body = (java.util.Map<String, Object>) response.getBody();
        assertEquals("Incorrect current password.", body.get("message"));
        verify(userService, never()).updatePassword(any(), any());
    }

    @Test
    void changePasswordRejectsIdenticalNewPassword() {
        User user = User.builder().id(1L).username("adminUser").password("hashedOld").role(Role.ROLE_ADMIN).build();
        when(userService.getUserByUsername("adminUser")).thenReturn(Optional.of(user));
        when(userService.checkPassword(user, "SamePassword123!")).thenReturn(true);

        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("SamePassword123!")
                .newPassword("SamePassword123!")
                .confirmPassword("SamePassword123!")
                .build();

        ResponseEntity<?> response = userController.changePassword(request);

        assertEquals(400, response.getStatusCode().value());
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> body = (java.util.Map<String, Object>) response.getBody();
        assertEquals("New password must be different from current password.", body.get("message"));
        verify(userService, never()).updatePassword(any(), any());
    }

    @Test
    void changePasswordRejectsMismatchedConfirmPassword() {
        User user = User.builder().id(1L).username("adminUser").password("hashedOld").role(Role.ROLE_ADMIN).build();
        when(userService.getUserByUsername("adminUser")).thenReturn(Optional.of(user));
        when(userService.checkPassword(user, "OldPass123!")).thenReturn(true);

        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("OldPass123!")
                .newPassword("NewPass456!")
                .confirmPassword("DifferentPass456!")
                .build();

        ResponseEntity<?> response = userController.changePassword(request);

        assertEquals(400, response.getStatusCode().value());
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> body = (java.util.Map<String, Object>) response.getBody();
        assertEquals("New passwords do not match.", body.get("message"));
        verify(userService, never()).updatePassword(any(), any());
    }

    @Test
    void changePasswordCatchesPolicyViolationFromUserService() {
        User user = User.builder().id(1L).username("adminUser").password("hashedOld").role(Role.ROLE_ADMIN).build();
        when(userService.getUserByUsername("adminUser")).thenReturn(Optional.of(user));
        when(userService.checkPassword(user, "OldPass123!")).thenReturn(true);
        doThrow(new IllegalArgumentException("Password must contain at least one uppercase letter."))
                .when(userService).updatePassword(user, "weakpass123!");

        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("OldPass123!")
                .newPassword("weakpass123!")
                .confirmPassword("weakpass123!")
                .build();

        ResponseEntity<?> response = userController.changePassword(request);

        assertEquals(400, response.getStatusCode().value());
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> body = (java.util.Map<String, Object>) response.getBody();
        assertEquals("Password must contain at least one uppercase letter.", body.get("message"));
    }

    @Test
    void changePasswordAlwaysOperatesOnSecurityContextUser() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "alice", null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));

        User alice = User.builder().id(10L).username("alice").password("hashedAlice").role(Role.ROLE_USER).build();
        when(userService.getUserByUsername("alice")).thenReturn(Optional.of(alice));
        when(userService.checkPassword(alice, "AliceOld123!")).thenReturn(true);

        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("AliceOld123!")
                .newPassword("AliceNew456!")
                .build();

        ResponseEntity<?> response = userController.changePassword(request);

        assertEquals(200, response.getStatusCode().value());
        verify(userService).getUserByUsername("alice");
        verify(userService, never()).getUserByUsername("bob");
        verify(userService).updatePassword(alice, "AliceNew456!");
    }
}

