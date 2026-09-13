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
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Pallet p where p.id = :id")
    Optional<Pallet> lockById(@Param("id") Long id);
    long countByStatus(Pallet.Status status);
    @Query("select coalesce(sum(p.quantity), 0) from Pallet p") long totalCartons();
}
interface Movements extends JpaRepository<StockMovement, Long>, JpaSpecificationExecutor<StockMovement> {
    boolean existsByRequestId(UUID requestId);
    List<StockMovement> findByPalletIdOrderByCreatedAtAscIdAsc(Long palletId);
    List<StockMovement> findTop8ByOrderByCreatedAtDescIdDesc();
}
