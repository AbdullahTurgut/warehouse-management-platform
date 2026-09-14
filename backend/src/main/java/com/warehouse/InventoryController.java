package com.warehouse;

import static com.warehouse.ApiModels.*;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class InventoryController {
    private final InventoryService service;
    public InventoryController(InventoryService service) { this.service=service; }
    @GetMapping("/auth/csrf") public Map<String,String> csrf(CsrfToken token) {
        return Map.of("headerName",token.getHeaderName(),"token",token.getToken());
    }
    @GetMapping("/auth/me") public Map<String,String> me(Authentication auth) {
        return Map.of("username",auth.getName(),"role",auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_",""));
    }
    @GetMapping("/products") public List<Product> products(@RequestParam(defaultValue="") String search) { return service.products(search); }
    @PostMapping("/products") public Product createProduct(@Valid @RequestBody ProductInput input) { return service.createProduct(input); }
    @PutMapping("/products/{id}") public Product updateProduct(@PathVariable Long id,@Valid @RequestBody ProductInput input) { return service.updateProduct(id,input); }
    @GetMapping("/warehouses") public List<Warehouse> warehouses() { return service.warehouses(); }
    @PostMapping("/warehouses") public Warehouse createWarehouse(@Valid @RequestBody WarehouseInput input) { return service.createWarehouse(input); }
    @GetMapping("/locations") public List<LocationView> locations() { return service.locations(); }
    @PostMapping("/locations") public LocationView createLocation(@Valid @RequestBody LocationInput input) { return service.createLocation(input); }
    @GetMapping({"/inventory","/pallets"}) public PageView<PalletView> inventory(@RequestParam(defaultValue="") String search,
        @RequestParam(required=false) Pallet.Status status,@RequestParam(required=false) Long locationId,@RequestParam(defaultValue="0") int page) {
        return service.inventory(search,status,locationId,page);
    }
    @GetMapping("/pallets/{id}") public PalletDetail detail(@PathVariable Long id) { return service.detail(id); }
    @GetMapping("/movements") public PageView<MovementView> history(@RequestParam(defaultValue="") String search,
        @RequestParam(required=false) StockMovement.Type type,@RequestParam(defaultValue="0") int page) { return service.history(search,type,page); }
    @GetMapping("/scan-lookup") public ScanView scanLookup(@RequestParam String code) { return service.scanLookup(code); }
    @GetMapping("/dashboard") public Dashboard dashboard() { return service.dashboard(); }
    @PostMapping("/receipts") public PalletView receive(@Valid @RequestBody ReceiptInput input, Principal principal) { return service.receive(input,principal.getName()); }
    @PostMapping("/transfers") public PalletView transfer(@Valid @RequestBody TransferInput input, Principal principal) { return service.transfer(input,principal.getName()); }
    @PostMapping("/dispatches") public PalletView dispatch(@Valid @RequestBody DispatchInput input, Principal principal) { return service.dispatch(input,principal.getName()); }
    @GetMapping("/operations/{requestId}") public PalletView operationPallet(@PathVariable UUID requestId) { return service.operationPallet(requestId); }
}
