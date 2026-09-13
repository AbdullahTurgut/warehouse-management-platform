package com.warehouse;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class ReceivingSession {
    public enum Status { OPEN, COMPLETED }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false, unique = true, length = 40) public String code;
    @ManyToOne(optional = false) public Warehouse warehouse;
    @ManyToOne(optional = false) public Location receivingLocation;
    @Column(nullable = false, length = 100) public String deliveryNote = "";
    @Column(nullable = false, length = 160) public String supplier = "";
    public Integer expectedPalletCount;
    @Column(nullable = false, length = 1000) public String note = "";
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) public Status status = Status.OPEN;
    @Column(nullable = false, length = 100) public String openedBy;
    @Column(nullable = false) public Instant openedAt = Instant.now();
    public Instant completedAt;
    @Version public long version;
}
