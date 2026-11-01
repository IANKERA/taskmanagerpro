package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.UserDTO;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.Role;
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

    private UserController userController;

    @BeforeEach
    void setUp() {
        userController = new UserController(userService, notificationService);
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
}

