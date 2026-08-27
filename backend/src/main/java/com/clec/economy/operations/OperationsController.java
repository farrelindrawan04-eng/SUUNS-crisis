package com.clec.economy.operations;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/operations")
public class OperationsController {
    private final OperationsService service;
    public OperationsController(OperationsService service) { this.service=service; }

    @GetMapping("/sessions/{sessionId}/delegates")
    public List<OperationsDtos.DelegateResponse> delegates(@PathVariable String sessionId) { return service.listDelegates(sessionId); }
    @PostMapping("/sessions/{sessionId}/delegates") @ResponseStatus(HttpStatus.CREATED)
    public OperationsDtos.DelegateResponse createDelegate(@PathVariable String sessionId,
            @RequestBody OperationsDtos.CreateDelegateRequest request, Authentication authentication) {
        return service.createDelegate(sessionId, request, authentication.getName());
    }
    @DeleteMapping("/delegates/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDelegate(@PathVariable String id) { service.deactivateDelegate(id); }
    @GetMapping("/sessions/{sessionId}/directives")
    public List<OperationsDtos.DirectiveResponse> directives(@PathVariable String sessionId) { return service.listForSession(sessionId); }
    @PostMapping("/directives/{id}/responses") @ResponseStatus(HttpStatus.CREATED)
    public OperationsDtos.DirectiveResponse respond(@PathVariable String id, @RequestBody OperationsDtos.MessageRequest request,
                                                     Authentication authentication) { return service.staffRespond(id, request, authentication.getName()); }
    @PutMapping("/directives/{id}/status")
    public OperationsDtos.DirectiveResponse status(@PathVariable String id, @RequestBody OperationsDtos.StatusRequest request,
                                                    Authentication authentication) { return service.updateStatus(id, request, authentication.getName()); }

    @GetMapping("/delegate/profile")
    public OperationsDtos.DelegateResponse profile(Authentication authentication) { return service.currentDelegate(authentication.getName()); }
    @GetMapping("/delegate/situation")
    public OperationsDtos.PublicSituationResponse situation(Authentication authentication) { return service.publicSituation(authentication.getName()); }
    @GetMapping("/delegate/directives")
    public List<OperationsDtos.DirectiveResponse> myDirectives(Authentication authentication) { return service.listForDelegate(authentication.getName()); }
    @PostMapping("/delegate/directives") @ResponseStatus(HttpStatus.CREATED)
    public OperationsDtos.DirectiveResponse createDirective(@RequestBody OperationsDtos.CreateDirectiveRequest request, Authentication authentication) {
        return service.createDirective(request, authentication.getName());
    }
    @PostMapping("/delegate/directives/{id}/messages") @ResponseStatus(HttpStatus.CREATED)
    public OperationsDtos.DirectiveResponse delegateMessage(@PathVariable String id, @RequestBody OperationsDtos.MessageRequest request,
                                                             Authentication authentication) { return service.delegateRespond(id, request, authentication.getName()); }
}
