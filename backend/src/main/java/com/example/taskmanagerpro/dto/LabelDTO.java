package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.Label;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabelDTO {
    private Long id;
    private String name;
    private String color;

    public static LabelDTO from(Label l) {
        return LabelDTO.builder().id(l.getId()).name(l.getName()).color(l.getColor()).build();
    }
}
