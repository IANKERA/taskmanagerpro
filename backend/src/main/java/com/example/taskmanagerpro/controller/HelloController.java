package com.example.taskmanagerpro;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/")
    public String home() {
        return "Welcome to Task Manager Pro! 🚀";
    }

    @GetMapping("/hello")
    public String hello() {
        return "Hello, Spring Boot is running! 🚀";
    }
}
