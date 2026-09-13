package com.warehouse;

import static com.warehouse.ApiModels.*;
import static com.warehouse.InventoryService.*;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class ReceivingSessionService {
    private final ReceivingSessions sessions;
    private final Warehouses warehouses;
    private final Locations locations;
    private final Pallets pallets;
    private final InventoryService inventory;
    private final EntityManager em;
    public ReceivingSessionService(ReceivingSessions sessions, Warehouses warehouses, Locations locations,
                                   Pallets pallets, InventoryService inventory, EntityManager em) {
        this.sessions=sessions; this.warehouses=warehouses; this.locations=locations;
        this.pallets=pallets; this.inventory=inventory; this.em=em;
    }
    private SessionView view(ReceivingSession s) {
        return new SessionView(s.id,s.code,s.warehouse.id,s.warehouse.name,s.receivingLocation.id,s.receivingLocation.code,
            s.deliveryNote,s.supplier,s.expectedPalletCount,s.note,s.status,s.openedBy,s.openedAt,s.completedAt,s.version,
            pallets.countByReceivingSessionId(s.id),pallets.countByReceivingSessionIdAndFirstPutAwayAtIsNotNull(s.id),
            pallets.countByReceivingSessionIdAndFirstPutAwayAtIsNullAndStatus(s.id,Pallet.Status.ACTIVE),
            pallets.countByReceivingSessionIdAndFirstPutAwayAtIsNullAndStatus(s.id,Pallet.Status.DISPATCHED));
    }
    public PageView<SessionView> list(ReceivingSession.Status status, int page) {
        var result=sessions.findAll((root,query,cb) -> status==null ? cb.conjunction() : cb.equal(root.get("status"),status),
            PageRequest.of(Math.max(0,page),25,Sort.by(Sort.Direction.DESC,"openedAt","id")));
        return new PageView<>(result.getContent().stream().map(this::view).toList(),result.getTotalElements(),result.getNumber(),result.getTotalPages());
    }
    public SessionDetail detail(Long id) {
        ReceivingSession s=sessions.findById(id).orElseThrow(() -> missing("Receiving session"));
        List<PalletView> items=pallets.findByReceivingSessionIdOrderByCreatedAtAscIdAsc(id).stream().map(inventory::palletView).toList();
        var queue=items.stream().filter(p -> p.status()==Pallet.Status.ACTIVE && p.firstPutAwayAt()==null
            && p.location()!=null && p.location().type()==Location.Type.STAGING).toList();
        return new SessionDetail(view(s),items,queue);
    }
    @Transactional
    public SessionView create(SessionInput input, String actor) {
        Warehouse w=warehouses.findById(input.warehouseId()).orElseThrow(() -> missing("Warehouse"));
        Location l=locations.findById(input.receivingLocationId()).orElseThrow(() -> missing("Location"));
        if(!l.active || l.type!=Location.Type.STAGING || !l.warehouse.id.equals(w.id)) throw invalid("Choose a staging location in the selected warehouse");
        long sequence=((Number)em.createNativeQuery("select nextval('receiving_session_code_seq')").getSingleResult()).longValue();
        ReceivingSession s=new ReceivingSession(); s.code="MK-"+String.format(Locale.ROOT,"%06d",sequence);
        s.warehouse=w; s.receivingLocation=l; s.deliveryNote=clean(input.deliveryNote()); s.supplier=clean(input.supplier());
        s.expectedPalletCount=input.expectedPalletCount(); s.note=clean(input.note()); s.openedBy=actor;
        sessions.saveAndFlush(s); return view(s);
    }
    @Transactional
    public SessionView complete(Long id, CompleteSessionInput input) {
        ReceivingSession s=sessions.lockById(id).orElseThrow(() -> missing("Receiving session"));
        if(s.status==ReceivingSession.Status.COMPLETED) return view(s);
        if(s.version!=input.version()) throw new ResponseStatusException(HttpStatus.CONFLICT,"Receiving session changed; refresh before continuing");
        SessionView progress=view(s);
        if(progress.receivedCount()==0) throw invalid("Receive at least one pallet before completing");
        if(progress.pendingCount()>0) throw invalid("Place the remaining pallets before completing");
        if(s.expectedPalletCount!=null && s.expectedPalletCount.longValue()!=progress.receivedCount() && !input.confirmCountMismatch())
            throw invalid("Confirm the expected and received pallet count difference");
        s.status=ReceivingSession.Status.COMPLETED; s.completedAt=Instant.now();
        em.flush(); return view(s);
    }
}
