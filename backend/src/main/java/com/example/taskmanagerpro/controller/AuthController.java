package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.AuthRequest;
import com.example.taskmanagerpro.dto.AuthResponse;
import com.example.taskmanagerpro.dto.Mapper;
import com.example.taskmanagerpro.dto.UserDTO;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.Role;
import com.example.taskmanagerpro.security.JwtService;
import com.example.taskmanagerpro.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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


    // User registration
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        if (userService.usernameExists(user.getUsername())) {
            Map<String, String> error = Map.of("error", "Username already exists");
            return ResponseEntity.badRequest().body(error);
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User savedUser = userService.saveUser(user);

        UserDTO dto = Mapper.toUserDTO(savedUser);
        return ResponseEntity.ok(dto);
    }


    // User login
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            String jwt = jwtService.generateToken(request.getUsername());
            return ResponseEntity.ok(new AuthResponse(jwt));

        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> error = Map.of("error", "Invalid username or password");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }
    }
}
