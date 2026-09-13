package com.warehouse;

import jakarta.persistence.*;

@Entity
public class Location {
    public enum Type { ZONE, AISLE, RACK, SHELF, STAGING }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @ManyToOne(optional = false) public Warehouse warehouse;
    @ManyToOne public Location parent;
    @Column(nullable = false, length = 40) public String code;
    @Column(nullable = false, length = 160) public String name;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) public Type type;
    @Column(nullable = false) public boolean active = true;
}
