package com.warehouse;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ApiModels {
    public record ProductInput(@NotBlank @Size(max=60) String sku, @NotBlank @Size(max=160) String name,
                               @Size(max=2000) String description, boolean active) {}
    public record WarehouseInput(@NotBlank @Size(max=40) String code, @NotBlank @Size(max=160) String name) {}
    public record LocationInput(@NotNull Long warehouseId, Long parentId, @NotNull Location.Type type,
                                @NotBlank @Size(max=40) String code, @NotBlank @Size(max=160) String name) {}
    public record ReceiptInput(@NotNull Long productId, @NotNull Long locationId, @Positive int quantity,
                               @NotNull UUID requestId, @Size(max=300) String reference, Long receivingSessionId) {
        public ReceiptInput(Long productId, Long locationId, int quantity, UUID requestId, String reference) {
            this(productId, locationId, quantity, requestId, reference, null);
        }
    }
    public record TransferInput(@NotNull Long palletId, @NotNull Long locationId, @NotNull @PositiveOrZero Long version,
                                @NotNull UUID requestId, @Size(max=300) String reference) {}
    public record DispatchInput(@NotNull Long palletId, @Positive int quantity, @NotNull @PositiveOrZero Long version,
                                @NotNull UUID requestId, @Size(max=300) String reference) {}
    public record LocationView(Long id, Long warehouseId, String warehouseName, Long parentId, String code,
                               String name, Location.Type type, String path, boolean selectable, boolean active) {}
    public record PalletView(Long id, String code, Long productId, String sku, String productName, int quantity,
                             LocationView location, Pallet.Status status, long version, Instant createdAt,
                             Long receivingSessionId, String receivingSessionCode, Instant firstPutAwayAt) {}
    public record MovementView(Long id, Instant createdAt, StockMovement.Type type, Long palletId, String palletCode,
                               String sku, String productName, int quantity, int balanceAfter,
                               String sourceLocation, String destinationLocation, String actor, String reference) {}
    public record PalletDetail(PalletView pallet, List<MovementView> movements) {}
    public record PageView<T>(List<T> items, long total, int page, int totalPages) {}
    public record SessionInput(@NotNull Long warehouseId, @NotNull Long receivingLocationId,
                               @Size(max=100) String deliveryNote, @Size(max=160) String supplier,
                               @Positive Integer expectedPalletCount, @Size(max=1000) String note) {}
    public record CompleteSessionInput(@NotNull @PositiveOrZero Long version, boolean confirmCountMismatch) {}
    public record SessionView(Long id, String code, Long warehouseId, String warehouseName,
                              Long receivingLocationId, String receivingLocationCode,
                              String deliveryNote, String supplier, Integer expectedPalletCount, String note,
                              ReceivingSession.Status status, String openedBy, Instant openedAt, Instant completedAt,
                              long version, long receivedCount, long putAwayCount, long pendingCount, long dispatchedBeforePutAwayCount) {}
    public record SessionDetail(SessionView session, List<PalletView> pallets, List<PalletView> queue) {}
    public record Dashboard(long activePallets, long totalCartons, long productCount, List<MovementView> recentMovements) {}
}
