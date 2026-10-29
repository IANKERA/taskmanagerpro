package com.example.taskmanagerpro;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class TaskManagerProApplication {
    public static void main(String[] args) {
        SpringApplication.run(TaskManagerProApplication.class, args);
    }
}
