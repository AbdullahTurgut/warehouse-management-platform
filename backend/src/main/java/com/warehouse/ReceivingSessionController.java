package com.warehouse;

import static com.warehouse.ApiModels.*;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/receiving-sessions")
public class ReceivingSessionController {
    private final ReceivingSessionService service;
    public ReceivingSessionController(ReceivingSessionService service) { this.service=service; }
    @GetMapping public PageView<SessionView> list(@RequestParam(required=false) ReceivingSession.Status status,
                                                 @RequestParam(defaultValue="0") int page) { return service.list(status,page); }
    @PostMapping public SessionView create(@Valid @RequestBody SessionInput input, Principal principal) { return service.create(input,principal.getName()); }
    @GetMapping("/{id}") public SessionDetail detail(@PathVariable Long id) { return service.detail(id); }
    @PostMapping("/{id}/complete") public SessionView complete(@PathVariable Long id,@Valid @RequestBody CompleteSessionInput input) { return service.complete(id,input); }
}
