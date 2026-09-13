package com.warehouse;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
public class StockMovement {
    public enum Type { RECEIPT, TRANSFER, DISPATCH }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @ManyToOne(optional = false) public Pallet pallet;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) public Type type;
    @Column(nullable = false) public int quantity;
    @Column(nullable = false) public int balanceAfter;
    @ManyToOne public Location source;
    @ManyToOne public Location destination;
    @Column(nullable = false, length = 100) public String actor;
    @Column(nullable = false, length = 300) public String reference = "";
    @Column(nullable = false, unique = true) public UUID requestId;
    @Column(nullable = false) public Instant createdAt = Instant.now();
}
