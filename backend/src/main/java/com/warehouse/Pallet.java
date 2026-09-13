package com.warehouse;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class Pallet {
    public enum Status { ACTIVE, DISPATCHED }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false, unique = true, length = 40) public String code;
    @ManyToOne(optional = false) public Product product;
    @ManyToOne public Location location;
    @Column(nullable = false) public int quantity;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) public Status status = Status.ACTIVE;
    @Version public long version;
    @Column(nullable = false) public Instant createdAt = Instant.now();
}
