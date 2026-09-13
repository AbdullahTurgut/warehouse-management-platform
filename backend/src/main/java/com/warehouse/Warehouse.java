package com.warehouse;

import jakarta.persistence.*;

@Entity
public class Warehouse {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false, unique = true, length = 40) public String code;
    @Column(nullable = false, length = 160) public String name;
}
