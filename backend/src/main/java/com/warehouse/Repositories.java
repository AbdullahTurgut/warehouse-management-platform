package com.warehouse;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface Products extends JpaRepository<Product, Long> {
    List<Product> findAllByOrderBySkuAsc();
}
interface Warehouses extends JpaRepository<Warehouse, Long> {}
interface Locations extends JpaRepository<Location, Long> {
    List<Location> findAllByOrderByCodeAsc();
}
interface Pallets extends JpaRepository<Pallet, Long>, JpaSpecificationExecutor<Pallet> {
    Optional<Pallet> findByCode(String code);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Pallet p where p.id = :id")
    Optional<Pallet> lockById(@Param("id") Long id);
    List<Pallet> findByReceivingSessionIdOrderByCreatedAtAscIdAsc(Long sessionId);
    long countByReceivingSessionId(Long sessionId);
    long countByReceivingSessionIdAndFirstPutAwayAtIsNotNull(Long sessionId);
    long countByReceivingSessionIdAndFirstPutAwayAtIsNullAndStatus(Long sessionId, Pallet.Status status);
    long countByStatus(Pallet.Status status);
    @Query("select coalesce(sum(p.quantity), 0) from Pallet p") long totalCartons();
}
interface ReceivingSessions extends JpaRepository<ReceivingSession, Long>, JpaSpecificationExecutor<ReceivingSession> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from ReceivingSession s where s.id = :id")
    Optional<ReceivingSession> lockById(@Param("id") Long id);
}
interface Movements extends JpaRepository<StockMovement, Long>, JpaSpecificationExecutor<StockMovement> {
    boolean existsByRequestId(UUID requestId);
    List<StockMovement> findByPalletIdOrderByCreatedAtAscIdAsc(Long palletId);
    List<StockMovement> findTop8ByOrderByCreatedAtDescIdDesc();
}
