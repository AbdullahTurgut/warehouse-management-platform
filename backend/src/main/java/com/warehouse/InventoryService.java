package com.warehouse;

import static com.warehouse.ApiModels.*;
import java.util.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class InventoryService {
    private final Products products;
    private final Warehouses warehouses;
    private final Locations locations;
    private final Pallets pallets;
    private final Movements movements;
    private final EntityManager em;
    private final ReceivingSessions sessions;

    public InventoryService(Products products, Warehouses warehouses, Locations locations,
                            Pallets pallets, Movements movements, EntityManager em, ReceivingSessions sessions) {
        this.products=products; this.warehouses=warehouses; this.locations=locations;
        this.pallets=pallets; this.movements=movements; this.em=em; this.sessions=sessions;
    }

    static ResponseStatusException invalid(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    static ResponseStatusException missing(String name) { return new ResponseStatusException(HttpStatus.NOT_FOUND, name + " not found"); }
    static String clean(String value) { return value == null ? "" : value.strip(); }
    static String code(String value) { return clean(value).toUpperCase(Locale.ROOT); }
    static void requireText(String value, String label) { if (clean(value).isEmpty()) throw invalid(label + " is required"); }

    public List<Product> products(String search) {
        String q=clean(search).toLowerCase(Locale.ROOT);
        return products.findAllByOrderBySkuAsc().stream()
            .filter(p -> (p.sku+" "+p.name).toLowerCase(Locale.ROOT).contains(q)).toList();
    }
    @Transactional
    public Product createProduct(ProductInput input) {
        Product p=new Product(); applyProduct(p,input); return products.saveAndFlush(p);
    }
    @Transactional
    public Product updateProduct(Long id, ProductInput input) {
        Product p=products.findById(id).orElseThrow(() -> missing("Product"));
        applyProduct(p,input); return products.saveAndFlush(p);
    }
    private void applyProduct(Product p, ProductInput input) {
        requireText(input.sku(),"SKU"); requireText(input.name(),"Product name");
        p.sku=code(input.sku()); p.name=clean(input.name()); p.description=clean(input.description()); p.active=input.active();
    }
    public List<Warehouse> warehouses() { return warehouses.findAll(Sort.by("code")); }
    @Transactional
    public Warehouse createWarehouse(WarehouseInput input) {
        requireText(input.code(),"Warehouse code"); requireText(input.name(),"Warehouse name");
        Warehouse w=new Warehouse(); w.code=code(input.code()); w.name=clean(input.name()); return warehouses.saveAndFlush(w);
    }
    public List<LocationView> locations() { return locations.findAllByOrderByCodeAsc().stream().map(this::locationView).toList(); }
    @Transactional
    public LocationView createLocation(LocationInput input) {
        requireText(input.code(),"Location code"); requireText(input.name(),"Location name");
        Warehouse w=warehouses.findById(input.warehouseId()).orElseThrow(() -> missing("Warehouse"));
        Location parent=input.parentId()==null ? null : locations.findById(input.parentId()).orElseThrow(() -> missing("Parent location"));
        Location.Type expected=switch(input.type()) {
            case AISLE -> Location.Type.ZONE; case RACK -> Location.Type.AISLE; case SHELF -> Location.Type.RACK; default -> null;
        };
        if (expected==null && parent!=null) throw invalid("Zones and staging locations must be directly under the warehouse");
        if (expected!=null && (parent==null || parent.type!=expected)) throw invalid("Parent must be a " + expected);
        if (parent!=null && (!parent.warehouse.id.equals(w.id) || !parent.active)) throw invalid("Parent must be active and in the same warehouse");
        Location l=new Location(); l.warehouse=w; l.parent=parent; l.type=input.type(); l.code=code(input.code()); l.name=clean(input.name());
        return locationView(locations.saveAndFlush(l));
    }
    private String path(Location location) {
        if (location==null) return null;
        return location.parent==null ? location.warehouse.code+" / "+location.code : path(location.parent)+" / "+location.code;
    }
    private LocationView locationView(Location l) {
        if(l==null) return null;
        return new LocationView(l.id,l.warehouse.id,l.warehouse.name,l.parent==null ? null : l.parent.id,l.code,l.name,l.type,path(l),
            l.active && (l.type==Location.Type.SHELF || l.type==Location.Type.STAGING),l.active);
    }
    PalletView palletView(Pallet p) {
        return new PalletView(p.id,p.code,p.product.id,p.product.sku,p.product.name,p.quantity,locationView(p.location),p.status,p.version,p.createdAt,
            p.receivingSession==null ? null : p.receivingSession.id, p.receivingSession==null ? null : p.receivingSession.code,p.firstPutAwayAt);
    }
    private MovementView movementView(StockMovement m) {
        return new MovementView(m.id,m.createdAt,m.type,m.pallet.id,m.pallet.code,m.pallet.product.sku,m.pallet.product.name,
            m.quantity,m.balanceAfter,path(m.source),path(m.destination),m.actor,m.reference);
    }
    private PageRequest paging(int page) { return PageRequest.of(Math.max(0,page),25,Sort.by(Sort.Direction.DESC,"createdAt","id")); }
    private String pattern(String value) {
        return "%"+clean(value).toLowerCase(Locale.ROOT).replace("\\","\\\\").replace("%","\\%").replace("_","\\_")+"%";
    }
    public PageView<PalletView> inventory(String search, Pallet.Status status, Long locationId, int page) {
        var result=pallets.findAll((root,query,cb) -> {
            List<Predicate> filters=new ArrayList<>();
            if (!clean(search).isEmpty()) {
                var product=root.join("product"); var location=root.join("location",JoinType.LEFT);
                String q=pattern(search);
                filters.add(cb.or(cb.like(cb.lower(root.get("code")),q,'\\'), cb.like(cb.lower(product.get("sku")),q,'\\'),
                    cb.like(cb.lower(product.get("name")),q,'\\'),cb.like(cb.lower(location.get("code")),q,'\\')));
            }
            if(status!=null) filters.add(cb.equal(root.get("status"),status));
            if(locationId!=null) filters.add(cb.equal(root.get("location").get("id"),locationId));
            return cb.and(filters.toArray(Predicate[]::new));
        },paging(page));
        return new PageView<>(result.getContent().stream().map(this::palletView).toList(),result.getTotalElements(),result.getNumber(),result.getTotalPages());
    }
    public PalletDetail detail(Long id) {
        Pallet p=pallets.findById(id).orElseThrow(() -> missing("Pallet"));
        return new PalletDetail(palletView(p),movements.findByPalletIdOrderByCreatedAtAscIdAsc(id).stream().map(this::movementView).toList());
    }
    public PageView<MovementView> history(String search, StockMovement.Type type, int page) {
        var result=movements.findAll((root,query,cb) -> {
            List<Predicate> filters=new ArrayList<>();
            if(type!=null) filters.add(cb.equal(root.get("type"),type));
            if(!clean(search).isEmpty()) {
                var pallet=root.join("pallet"); var product=pallet.join("product"); String q=pattern(search);
                filters.add(cb.or(cb.like(cb.lower(pallet.get("code")),q,'\\'), cb.like(cb.lower(product.get("sku")),q,'\\'),cb.like(cb.lower(product.get("name")),q,'\\')));
            }
            return cb.and(filters.toArray(Predicate[]::new));
        },paging(page));
        return new PageView<>(result.getContent().stream().map(this::movementView).toList(),result.getTotalElements(),result.getNumber(),result.getTotalPages());
    }
    public ScanView scanLookup(String value) {
        if (value.matches("PLT-[0-9]+") && value.length() <= 40) {
            Pallet p = pallets.findByCode(value).orElseThrow(() -> missing("Scanned pallet"));
            return new ScanView("PALLET", palletView(p), null);
        }
        if (value.matches("LOC-[1-9][0-9]*")) {
            try {
                Location l = locations.findById(Long.parseLong(value.substring(4))).orElseThrow(() -> missing("Scanned location"));
                return new ScanView("LOCATION", null, locationView(l));
            } catch (NumberFormatException e) { throw missing("Scanned location"); }
        }
        throw missing("Scanned code");
    }
    public Dashboard dashboard() {
        return new Dashboard(pallets.countByStatus(Pallet.Status.ACTIVE),pallets.totalCartons(),products.count(),
            movements.findTop8ByOrderByCreatedAtDescIdDesc().stream().map(this::movementView).toList());
    }
    private Location destination(Long id) {
        Location l=locations.findById(id).orElseThrow(() -> missing("Location"));
        if(!l.active || (l.type!=Location.Type.SHELF && l.type!=Location.Type.STAGING)) throw invalid("Choose an active shelf or staging location");
        return l;
    }
    private void uniqueRequest(UUID id) {
        if(movements.existsByRequestId(id)) throw new ResponseStatusException(HttpStatus.CONFLICT,"This operation was already recorded. Refresh inventory before continuing.");
    }
    private Pallet activePallet(Long id, long version) {
        Pallet p=pallets.lockById(id).orElseThrow(() -> missing("Pallet"));
        if(p.version!=version) throw new ResponseStatusException(HttpStatus.CONFLICT,"This pallet changed. Refresh and check the remaining stock before retrying.");
        if(p.status!=Pallet.Status.ACTIVE) throw invalid("This pallet has already been fully dispatched");
        return p;
    }
    private void movement(Pallet p, StockMovement.Type type, int quantity, Location source, Location dest, UUID requestId, String reference, String actor) {
        StockMovement m=new StockMovement(); m.pallet=p; m.type=type; m.quantity=quantity; m.balanceAfter=p.quantity;
        m.source=source; m.destination=dest; m.requestId=requestId; m.reference=clean(reference); m.actor=actor; movements.save(m);
    }
    @Transactional
    public PalletView receive(ReceiptInput input, String actor) {
        uniqueRequest(input.requestId());
        ReceivingSession session = null;
        if(input.receivingSessionId()!=null) {
            session=sessions.lockById(input.receivingSessionId()).orElseThrow(() -> missing("Receiving session"));
            if(session.status!=ReceivingSession.Status.OPEN) throw invalid("Receiving session is completed");
            if(!session.receivingLocation.id.equals(input.locationId())) throw invalid("Use the session receiving location");
        }
        Product product=products.findById(input.productId()).orElseThrow(() -> missing("Product"));
        if(!product.active) throw invalid("Inactive products cannot be received");
        Location loc=destination(input.locationId());
        long sequence=((Number)em.createNativeQuery("select nextval('pallet_code_seq')").getSingleResult()).longValue();
        Pallet p=new Pallet(); p.code="PLT-"+String.format(Locale.ROOT,"%06d",sequence); p.product=product; p.location=loc; p.quantity=input.quantity(); pallets.save(p);
        p.receivingSession=session;
        if(loc.type==Location.Type.SHELF) p.firstPutAwayAt=java.time.Instant.now();
        movement(p,StockMovement.Type.RECEIPT,input.quantity(),null,loc,input.requestId(),input.reference(),actor);
        em.flush(); return palletView(p);
    }
    @Transactional
    public PalletView transfer(TransferInput input, String actor) {
        uniqueRequest(input.requestId()); Pallet p=activePallet(input.palletId(),input.version()); Location dest=destination(input.locationId());
        if(p.location.id.equals(dest.id)) throw invalid("Choose a different destination");
        if(!p.location.warehouse.id.equals(dest.warehouse.id)) throw invalid("Interwarehouse transfers are outside this prototype");
        Location source=p.location; p.location=dest;
        if(dest.type==Location.Type.SHELF && p.firstPutAwayAt==null) p.firstPutAwayAt=java.time.Instant.now();
        movement(p,StockMovement.Type.TRANSFER,p.quantity,source,dest,input.requestId(),input.reference(),actor);
        em.flush(); return palletView(p);
    }
    @Transactional
    public PalletView dispatch(DispatchInput input, String actor) {
        uniqueRequest(input.requestId()); Pallet p=activePallet(input.palletId(),input.version());
        if(input.quantity()>p.quantity) throw invalid("Dispatch quantity exceeds the available " + p.quantity + " cartons");
        Location source=p.location; p.quantity-=input.quantity();
        if(p.quantity==0) { p.status=Pallet.Status.DISPATCHED; p.location=null; }
        movement(p,StockMovement.Type.DISPATCH,input.quantity(),source,null,input.requestId(),input.reference(),actor);
        em.flush(); return palletView(p);
    }
}
