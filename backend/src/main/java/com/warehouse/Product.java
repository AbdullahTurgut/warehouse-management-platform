package com.warehouse;

import jakarta.persistence.*;

@Entity
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false, unique = true, length = 60) public String sku;
    @Column(nullable = false, length = 160) public String name;
    @Column(nullable = false, length = 2000) public String description = "";
    @Column(nullable = false) public boolean active = true;
}
