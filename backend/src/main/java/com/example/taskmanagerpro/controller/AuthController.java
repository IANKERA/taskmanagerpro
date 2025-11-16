package com.example.taskmanagerpro.controller;
import com.example.taskmanagerpro.security.JwtService;
import com.example.taskmanagerpro.dto.AuthRequest;
import com.example.taskmanagerpro.dto.AuthResponse;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.security.JwtService;
import com.example.taskmanagerpro.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest request) {
        try {
            userService.registerUser(request.getUsername(), request.getPassword());
            return ResponseEntity.ok("User registered successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // User login
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request) {
        // Authenticate user
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        // Generate JWT
        final String jwt = jwtService.generateToken(request.getUsername());
        return ResponseEntity.ok(new AuthResponse(jwt));
    }

    @GetMapping("/validate-token")
    public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String authHeader) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(400).body("Missing or invalid Authorization header");
        }

        String token = authHeader.substring(7);

        try {
            String username = jwtService.extractUsername(token);

            boolean isValid = jwtService.isTokenValid(token);

            return ResponseEntity.ok(
                    Map.of(
                            "valid", isValid,
                            "username", username,
                            "expiresAt", jwtService.extractExpiration(token).toString()
                    )
            );

        } catch (Exception e) {
            return ResponseEntity.status(401).body(
                    Map.of(
                            "valid", false,
                            "error", "Invalid or expired token"
                    )
            );
        }
    }

}
